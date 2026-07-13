'use client';

import { useCallback, useEffect, useMemo, useRef, useState, DragEvent } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  BackgroundVariant,
  Node,
  Edge,
  ReactFlowProvider,
  useReactFlow,
  NodeMouseHandler,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { BrandNode, TemplateNode, ReferenceNode, ImageNode, PromptNode, GenerateNode, VideoNode, TextNode, AIPromptNode } from '@/components/nodes';
import NodePalette from '@/components/NodePalette';
import WorkflowTemplatesModal, { WorkflowTemplate } from '@/components/WorkflowTemplatesModal';
import { getBrands, getTemplates, generateImage, generateVideo, uploadFile, generateAIPrompt } from '@/lib/api';
import { Brand, Template, ImageGeneration, VideoGeneration } from '@/types';
import { Sparkles, Play, Trash2, X, RefreshCw, Download, Edit3, ImageIcon, LayoutTemplate } from 'lucide-react';
import toast from 'react-hot-toast';
import SidePanel from '@/components/SidePanel';

// ═══════════════════════════════════════════════
// CONNECTION RULES - ComfyUI style: tự do nối, nhiều node cùng loại
// ═══════════════════════════════════════════════
const CONNECTION_RULES: Record<string, string[]> = {
  brand: ['template', 'references', 'image', 'prompt', 'generate', 'aiprompt'],
  template: ['prompt', 'generate', 'aiprompt'],
  references: ['prompt', 'generate', 'image', 'aiprompt'],
  image: ['prompt', 'generate', 'image', 'video', 'aiprompt'],
  prompt: ['generate', 'video', 'prompt'],
  generate: ['video', 'generate', 'image', 'prompt'],
  video: ['video'],
  text: ['brand', 'template', 'references', 'image', 'prompt', 'generate', 'video', 'text', 'aiprompt'],
  aiprompt: ['generate', 'prompt', 'video'],
};

const initialNodes: Node[] = [
  // Brand Node - chọn thương hiệu
  { id: 'brand-1', type: 'brand', position: { x: 50, y: 50 }, data: {} },
  // Reference Node - upload hình tham khảo
  { id: 'references-1', type: 'references', position: { x: 50, y: 250 }, data: {} },
  // Prompt Builder - nhập mô tả, style → tạo prompt
  { id: 'prompt-1', type: 'prompt', position: { x: 400, y: 150 }, data: {} },
  // Generate Image - tạo ảnh từ prompt
  { id: 'generate-1', type: 'generate', position: { x: 750, y: 150 }, data: {} },
];

const initialEdges: Edge[] = [
  { id: 'e1', source: 'brand-1', target: 'prompt-1', animated: true },
  { id: 'e2', source: 'references-1', target: 'prompt-1', animated: true },
  { id: 'e3', source: 'prompt-1', target: 'generate-1', animated: true },
];

// ═══════════════════════════════════════════════
// TOPOLOGICAL SORT - Chạy flow theo thứ tự DAG
// Xét cả edges gián tiếp qua nodes trung gian
// ═══════════════════════════════════════════════
function topologicalSort(execNodes: Node[], edges: Edge[], allNodes: Node[]): Node[] {
  const execIds = new Set(execNodes.map((n) => n.id));

  // Build full graph để tìm reachability giữa executable nodes
  // Dùng BFS từ mỗi exec node để tìm exec nodes nào reachable
  const adj: Record<string, string[]> = {};
  allNodes.forEach((n) => { adj[n.id] = []; });
  edges.forEach((e) => {
    if (adj[e.source]) adj[e.source].push(e.target);
  });

  // Tìm exec nodes mà execA có thể reach tới (qua bất kỳ path nào)
  function findReachableExecNodes(startId: string): string[] {
    const visited = new Set<string>();
    const queue = [startId];
    const reachable: string[] = [];
    visited.add(startId);

    while (queue.length > 0) {
      const current = queue.shift()!;
      for (const next of (adj[current] || [])) {
        if (visited.has(next)) continue;
        visited.add(next);
        if (execIds.has(next) && next !== startId) {
          reachable.push(next);
        } else {
          // Tiếp tục qua node trung gian
          queue.push(next);
        }
      }
    }
    return reachable;
  }

  // Build dependency graph giữa exec nodes
  const inDegree: Record<string, number> = {};
  const execAdj: Record<string, string[]> = {};
  execNodes.forEach((n) => { inDegree[n.id] = 0; execAdj[n.id] = []; });

  execNodes.forEach((n) => {
    const targets = findReachableExecNodes(n.id);
    for (const t of targets) {
      execAdj[n.id].push(t);
      inDegree[t] = (inDegree[t] || 0) + 1;
    }
  });

  // BFS Kahn's algorithm
  const queue = execNodes.filter((n) => (inDegree[n.id] || 0) === 0);
  const result: Node[] = [];

  while (queue.length > 0) {
    const node = queue.shift()!;
    result.push(node);
    for (const next of (execAdj[node.id] || [])) {
      inDegree[next]--;
      if (inDegree[next] === 0) {
        const nextNode = execNodes.find((n) => n.id === next);
        if (nextNode) queue.push(nextNode);
      }
    }
  }

  // Append unreached nodes
  execNodes.forEach((n) => { if (!result.find((r) => r.id === n.id)) result.push(n); });

  return result;
}

let nodeId = 100;
function getNextId(type: string) {
  nodeId += 1;
  return `${type}-${nodeId}`;
}

function WorkflowCanvas() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition, getNode } = useReactFlow();

  // Data
  const [brands, setBrands] = useState<Brand[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [referenceFiles, setReferenceFiles] = useState<File[]>([]);
  const [imageNodeFiles, setImageNodeFiles] = useState<Record<string, File[]>>({});
  const [prompt, setPrompt] = useState('');
  const [sidePanel, setSidePanel] = useState<'brand' | 'template' | null>(null);

  // Generate state
  const [numImages, setNumImages] = useState(1);
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState<ImageGeneration[]>([]);
  const [showResults, setShowResults] = useState(false);

  // Edit/Regenerate
  const [editPrompt, setEditPrompt] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // Video state
  const [videoPrompt, setVideoPrompt] = useState('');
  const [generatingVideo, setGeneratingVideo] = useState(false);
  const [videoResult, setVideoResult] = useState<VideoGeneration | null>(null);

  // Text notes
  const [textNotes, setTextNotes] = useState<Record<string, string>>({});

  // Context menu
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; nodeId: string } | null>(null);

  // Templates modal
  const [showTemplates, setShowTemplates] = useState(false);

  // Edit brand modal
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Load saved workflow
  useEffect(() => {
    try {
      const saved = localStorage.getItem('workflow_draft');
      if (saved) {
        const { nodes: savedNodes, edges: savedEdges } = JSON.parse(saved);
        if (savedNodes?.length > 0) {
          setNodes(savedNodes);
          setEdges(savedEdges || []);
        }
      }
    } catch {}
  }, []);

  // Validate connection
  const isValidConnection = useCallback((connection: Connection) => {
    const { source, target } = connection;
    if (!source || !target) return false;
    const sourceNode = getNode(source);
    const targetNode = getNode(target);
    if (!sourceNode || !targetNode) return false;
    if (source === target) return false;
    const allowedTargets = CONNECTION_RULES[sourceNode.type || ''];
    if (!allowedTargets) return false;
    return allowedTargets.includes(targetNode.type || '');
  }, [getNode]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, animated: true }, eds)),
    [setEdges]
  );

  // Delete node
  const deleteNode = useCallback((nodeId: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
    setContextMenu(null);
  }, [setNodes, setEdges]);

  const onNodeContextMenu: NodeMouseHandler = useCallback((event, node) => {
    event.preventDefault();
    setContextMenu({ x: event.clientX, y: event.clientY, nodeId: node.id });
  }, []);

  const onPaneClick = useCallback(() => { setContextMenu(null); }, []);

  useEffect(() => {
    async function fetchData() {
      try {
        const [b, t] = await Promise.all([getBrands(), getTemplates()]);
        setBrands(b);
        setTemplates(t);
      } catch (err) { console.error(err); }
    }
    fetchData();
  }, []);

  // ═══════════════════════════════════════════════
  // RUN FLOW - Nút chạy chính
  // ═══════════════════════════════════════════════
  // Refs to always get latest values in callbacks
  // ═══════════════════════════════════════════════
  const promptRef = useRef(prompt);
  promptRef.current = prompt;
  const selectedBrandRef = useRef(selectedBrand);
  selectedBrandRef.current = selectedBrand;
  const selectedTemplateRef = useRef(selectedTemplate);
  selectedTemplateRef.current = selectedTemplate;
  const referenceFilesRef = useRef(referenceFiles);
  referenceFilesRef.current = referenceFiles;
  const imageNodeFilesRef = useRef(imageNodeFiles);
  imageNodeFilesRef.current = imageNodeFiles;

  const canRun = prompt.trim().length > 0 || nodes.some((n) => n.type === 'aiprompt');

  const handleRunFlow = useCallback(async (count?: number) => {
    const currentBrand = selectedBrandRef.current;
    const currentPrompt = promptRef.current;
    const currentTemplate = selectedTemplateRef.current;
    const currentFiles = referenceFilesRef.current;
    const currentImageFiles = imageNodeFilesRef.current;

    // Cho phép chạy nếu có node aiprompt (AI sẽ tự tạo prompt)
    const hasAIPromptNode = nodes.some((n) => n.type === 'aiprompt');
    if (!currentPrompt.trim() && !hasAIPromptNode) { toast.error('Nhập prompt hoặc thêm node Prompt Builder'); return; }

    const numToGenerate = count || numImages;
    setGenerating(true);
    setResults([]);

    try {
      // ═══ DAG Execution: chạy theo thứ tự topological ═══
      // 1. Tìm executable nodes CHỈ những node có edge kết nối (không chạy node cô lập)
      const connectedNodeIds = new Set([
        ...edges.map((e) => e.source),
        ...edges.map((e) => e.target),
      ]);
      const generateNodes = nodes.filter((n) => n.type === 'generate' && connectedNodeIds.has(n.id));
      const videoNodes = nodes.filter((n) => n.type === 'video' && connectedNodeIds.has(n.id));
      const aiPromptNodes = nodes.filter((n) => n.type === 'aiprompt' && connectedNodeIds.has(n.id));
      const executableNodes = [...aiPromptNodes, ...generateNodes, ...videoNodes];

      if (executableNodes.length === 0) {
        toast.error('Thêm node Generate hoặc Video vào flow');
        setGenerating(false);
        return;
      }

      // 2. Topological sort
      const sorted = topologicalSort(executableNodes, edges, nodes);
      console.log('[Flow] Execution order:', sorted.map(n => `${n.type}(${n.id})`));

      // 3. Execute từng node theo thứ tự
      const nodeResults: Record<string, string> = {}; // nodeId -> result URL
      const allResults: ImageGeneration[] = [];

      for (const execNode of sorted) {
        console.log(`[Flow] Executing: ${execNode.type}(${execNode.id})`);

        // Update node status → running
        setNodes((nds) => nds.map((n) => n.id === execNode.id ? { ...n, data: { ...n.data, status: 'running', generating: true } } : n));

        // Tìm inputs cho node này (nodes nối vào) — 2 levels deep
        const inputEdges = edges.filter((e) => e.target === execNode.id);
        const inputNodes = inputEdges.map((e) => nodes.find((n) => n.id === e.source)).filter(Boolean);

        // Cũng tìm inputs gián tiếp (inputs của input nodes - cho case Image → Prompt → Generate)
        const indirectInputs: any[] = [];
        for (const inp of inputNodes) {
          if (!inp) continue;
          const secondLevelEdges = edges.filter((e) => e.target === inp.id);
          const secondLevelNodes = secondLevelEdges.map((e) => nodes.find((n) => n.id === e.source)).filter(Boolean);
          indirectInputs.push(...secondLevelNodes);
        }
        const allInputNodes = [...inputNodes, ...indirectInputs];

        // Collect data từ input nodes
        let nodePrompt = currentPrompt;
        let refImages: string[] = [];

        for (const inp of allInputNodes) {
          if (!inp) continue;
          if (inp.type === 'prompt') {
            // Node prompt - check xem có aiprompt nối vào nó không
            const promptInputEdges = edges.filter((e) => e.target === inp.id);
            for (const pe of promptInputEdges) {
              if (nodeResults[pe.source]) {
                nodePrompt = nodeResults[pe.source];
                break;
              }
            }
          } else if (inp.type === 'aiprompt') {
            // Trực tiếp từ AI Prompt node
            if (nodeResults[inp.id]) {
              nodePrompt = nodeResults[inp.id];
            }
          } else if (inp.type === 'image') {
            // Upload files từ image node
            const files = currentImageFiles[inp.id] || [];
            console.log(`[Flow] Image node ${inp.id}: ${files.length} files`);
            for (const file of files) {
              const { url } = await uploadFile(file);
              refImages.push(url);
              console.log(`[Flow] Uploaded image: ${url.slice(0, 60)}`);
            }
          } else if (inp.type === 'references') {
            for (const file of currentFiles) {
              const { url } = await uploadFile(file);
              refImages.push(url);
            }
          } else if (inp.type === 'generate') {
            // Output từ node generate trước → dùng làm input image
            if (nodeResults[inp.id]) {
              refImages.push(nodeResults[inp.id]);
            }
          }
        }

        // Execute node
        if (execNode.type === 'aiprompt') {
          // AI Prompt Generator - đọc data từ node
          const nodeData = execNode.data || {};
          const nodeBrandName = nodeData.brandName || currentBrand?.name || '';
          const nodePrimaryColor = nodeData.primaryColor || currentBrand?.primary_color || '';
          const nodeSecondaryColor = nodeData.secondaryColor || currentBrand?.secondary_color || '';
          const nodeFontStyle = nodeData.fontStyle || '';
          const nodeMood = nodeData.mood || '';
          const nodeDescription = nodeData.description || currentPrompt || 'Professional marketing banner';
          const nodeRefFiles: File[] = nodeData._refFiles || [];
          const nodeLogoFile: File | null = nodeData._logoFile || null;

          toast('Đang tạo prompt...', { icon: '🪄' });

          // Upload reference images từ node
          let refImageUrls: string[] = [];
          for (const file of nodeRefFiles) {
            try {
              const { url } = await uploadFile(file);
              refImageUrls.push(url);
            } catch {}
          }
          // Upload logo
          if (nodeLogoFile) {
            try {
              const { url } = await uploadFile(nodeLogoFile);
              refImageUrls.unshift(url); // Logo first
            } catch {}
          }

          try {
            const { prompt: generatedPrompt } = await generateAIPrompt({
              brand_name: nodeBrandName || undefined,
              primary_color: nodePrimaryColor || undefined,
              secondary_color: nodeSecondaryColor || undefined,
              font_style: nodeFontStyle || undefined,
              mood: nodeMood || undefined,
              description: nodeDescription,
              reference_image_urls: refImageUrls.length > 0 ? refImageUrls : undefined,
            });
            nodeResults[execNode.id] = generatedPrompt;
            // Cũng lưu refImageUrls để generate node dùng
            nodeResults[execNode.id + '_refs'] = JSON.stringify(refImageUrls);
            setNodes((nds) => nds.map((n) => n.id === execNode.id ? { ...n, data: { ...n.data, generatedPrompt, status: 'done', generating: false } } : n));
            toast.success('✅ Prompt Builder xong');
          } catch (err) {
            console.error('AI Prompt error:', err);
            const fallback = nodeDescription;
            nodeResults[execNode.id] = fallback;
            setNodes((nds) => nds.map((n) => n.id === execNode.id ? { ...n, data: { ...n.data, generatedPrompt: fallback, status: 'error', generating: false } } : n));
            toast.error('Lỗi tạo prompt');
          }

        } else if (execNode.type === 'generate') {
          // Generate image
          const finalPrompt = nodePrompt || 'Professional marketing image';

          // Collect ref images: từ aiprompt node refs + image nodes
          let allRefImages = [...refImages];
          // Lấy thêm refs từ aiprompt node nếu có
          for (const inp of allInputNodes) {
            if (!inp) continue;
            if (inp.type === 'aiprompt' && nodeResults[inp.id + '_refs']) {
              try {
                const aipromptRefs = JSON.parse(nodeResults[inp.id + '_refs']);
                allRefImages = [...allRefImages, ...aipromptRefs];
              } catch {}
            }
          }

          console.log(`[Flow] Generate with prompt (${finalPrompt.length} chars): ${finalPrompt.slice(0, 100)}...`);
          console.log(`[Flow] Reference images: ${allRefImages.length}`);

          // Mỗi node chỉ tạo 1 ảnh
          console.log(`[Flow] Generating 1 image...`);

          const res = await generateImage({
            ...(currentBrand?.id ? { brand_id: currentBrand.id } : {}),
            user_input: finalPrompt,
            reference_images: allRefImages.length > 0 ? allRefImages : undefined,
          });
          const responses = [res];
          allResults.push(res);

          // Lưu result URL cho node tiếp theo
          if (responses[0]?.result_url) {
            nodeResults[execNode.id] = responses[0].result_url;
          }

          // Update node → done + hiện results
          setNodes((nds) => nds.map((n) => n.id === execNode.id ? { ...n, data: { ...n.data, status: 'done', generating: false, results: responses } } : n));
          toast.success(`✅ Generate xong: ${responses.length} ảnh`);
        } else if (execNode.type === 'video') {
          // Generate video - collect TẤT CẢ ảnh từ các node nối vào
          const videoImageUrls: string[] = [...refImages];

          // Lấy thêm output từ các generate nodes đã chạy
          for (const inp of allInputNodes) {
            if (!inp) continue;
            if (inp.type === 'generate' && nodeResults[inp.id]) {
              videoImageUrls.push(nodeResults[inp.id]);
            }
          }

          // Cũng collect tất cả results từ generate nodes trước đó
          for (const [nid, url] of Object.entries(nodeResults)) {
            if (!nid.endsWith('_refs') && url.startsWith('http') && !videoImageUrls.includes(url)) {
              // Check if this node is connected to video node
              const isConnected = edges.some(e => e.source === nid.replace('_refs', '') && e.target === execNode.id);
              if (!isConnected) {
                // Check indirect connection
                const sourceNode = nodes.find(n => n.id === nid);
                if (sourceNode?.type === 'generate') {
                  videoImageUrls.push(url);
                }
              }
            }
          }

          console.log(`[Flow] Video with ${videoImageUrls.length} images, prompt: ${nodePrompt.slice(0, 50)}`);

          toast('Đang tạo video...', { icon: '🎬' });
          const videoRes = await generateVideo({
            prompt: nodePrompt || 'Create a smooth animated video from these images',
            input_image_urls: videoImageUrls.length > 0 ? videoImageUrls : undefined,
          });

          setNodes((nds) => nds.map((n) => n.id === execNode.id ? { ...n, data: { ...n.data, status: 'done', generating: false } } : n));
          toast.success(`✅ Video đang tạo`);
        }
      }

      setResults(allResults);
      if (allResults.length > 0) {
        toast.success(`Flow hoàn tất! Tạo ${allResults.length} output`);
      }
    } catch (err) {
      toast.error('Chạy flow thất bại');
      console.error(err);
    } finally {
      setGenerating(false);
    }
  }, [numImages, nodes, edges]);

  // ═══════════════════════════════════════════════
  // EDIT / REGENERATE - Sửa hình không đúng ý
  // ═══════════════════════════════════════════════
  const handleRegenerate = useCallback(async (index: number, newPrompt?: string) => {
    const currentBrand = selectedBrandRef.current;
    const currentFiles = referenceFilesRef.current;
    const currentImageFiles = imageNodeFilesRef.current;
    const currentPrompt = promptRef.current;

    if (!currentBrand) return;

    const updatedResults = [...results];
    updatedResults[index] = { ...updatedResults[index], status: 'processing' as const };
    setResults(updatedResults);

    try {
      const imageUrls: string[] = [];
      for (const nodeFiles of Object.values(currentImageFiles)) {
        for (const file of nodeFiles) {
          const { url } = await uploadFile(file);
          imageUrls.push(url);
        }
      }
      const refUrls: string[] = [];
      for (const file of currentFiles) {
        const { url } = await uploadFile(file);
        refUrls.push(url);
      }
      const allRefs = [...imageUrls, ...refUrls];

      const res = await generateImage({
        brand_id: currentBrand.id,
        user_input: newPrompt || editPrompt || currentPrompt,
        reference_images: allRefs.length > 0 ? allRefs : undefined,
      });

      const updated = [...results];
      updated[index] = res;
      setResults(updated);
      setEditingIndex(null);
      setEditPrompt('');
      toast.success('Đã tạo lại hình ảnh!');
    } catch (err) {
      toast.error('Tạo lại thất bại');
      const updated = [...results];
      updated[index] = { ...updated[index], status: 'failed' as const };
      setResults(updated);
    }
  }, [results, editPrompt]);

  // Generate Video
  const handleGenerateVideo = useCallback(async () => {
    if (!videoPrompt.trim() && results.length === 0) {
      toast.error('Cần prompt hoặc hình ảnh input');
      return;
    }
    setGeneratingVideo(true);
    setVideoResult(null);
    try {
      const imageUrl = results.find(r => r.status === 'completed')?.result_url;
      const res = await generateVideo({
        prompt: videoPrompt || prompt,
        input_image_url: imageUrl,
      });
      setVideoResult(res);
      toast.success('Đã gửi yêu cầu tạo video!');
    } catch (err) {
      toast.error('Tạo video thất bại');
    } finally {
      setGeneratingVideo(false);
    }
  }, [videoPrompt, prompt, results]);

  // Drag & Drop
  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback((event: DragEvent) => {
    event.preventDefault();
    const type = event.dataTransfer.getData('application/reactflow');
    if (!type) return;
    const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
    setNodes((nds) => nds.concat({ id: getNextId(type), type, position, data: {} }));
  }, [screenToFlowPosition, setNodes]);

  // Stable ref for callbacks
  const handleRunFlowRef = useRef(handleRunFlow);
  handleRunFlowRef.current = handleRunFlow;
  const handleRegenerateRef = useRef(handleRegenerate);
  handleRegenerateRef.current = handleRegenerate;
  const handleGenerateVideoRef = useRef(handleGenerateVideo);
  handleGenerateVideoRef.current = handleGenerateVideo;
  const deleteNodeRef = useRef(deleteNode);
  deleteNodeRef.current = deleteNode;

  // Update node data
  useEffect(() => {
    setNodes(nds =>
      nds.map(node => {
        const deleteHandler = () => deleteNodeRef.current(node.id);
        if (node.type === 'brand') {
          return { ...node, data: { 
            brands, 
            selectedBrand, 
            onSelect: setSelectedBrand, 
            onCreateNew: () => setSidePanel('brand'), 
            onEdit: (brand: Brand) => setEditingBrand(brand),
            onDeleteBrand: async (brand: Brand) => {
              if (!confirm(`Xóa brand "${brand.name}"?`)) return;
              try {
                const { deleteBrand } = await import('@/lib/api');
                await deleteBrand(brand.id);
                setBrands(prev => prev.filter(b => b.id !== brand.id));
                if (selectedBrand?.id === brand.id) setSelectedBrand(null);
                toast.success('Đã xóa brand');
              } catch { toast.error('Lỗi xóa brand'); }
            },
            onDelete: deleteHandler 
          } };
        }
        if (node.type === 'template') {
          return { ...node, data: { templates, selectedTemplate, onSelect: setSelectedTemplate, onCreateNew: () => setSidePanel('template'), onDelete: deleteHandler } };
        }
        if (node.type === 'references') {
          return { ...node, data: { files: referenceFiles, onFilesAdd: (f: File[]) => setReferenceFiles(prev => [...prev, ...f]), onFileRemove: (i: number) => setReferenceFiles(prev => prev.filter((_, idx) => idx !== i)), onDelete: deleteHandler } };
        }
        if (node.type === 'image') {
          return { ...node, data: { files: imageNodeFiles[node.id] || [], onFilesAdd: (f: File[]) => setImageNodeFiles(prev => ({ ...prev, [node.id]: [...(prev[node.id] || []), ...f] })), onFileRemove: (i: number) => setImageNodeFiles(prev => ({ ...prev, [node.id]: (prev[node.id] || []).filter((_, idx) => idx !== i) })), onDelete: deleteHandler } };
        }
        if (node.type === 'prompt') {
          return { ...node, data: { prompt, onChange: setPrompt, onDelete: deleteHandler } };
        }
        if (node.type === 'generate') {
          return { ...node, data: { generating, results, onGenerate: (n: number) => handleRunFlowRef.current(n), onRegenerate: (i: number, p?: string) => handleRegenerateRef.current(i, p), canGenerate: !!selectedBrand && prompt.trim().length > 0, onDelete: deleteHandler } };
        }
        if (node.type === 'video') {
          return { ...node, data: { prompt: videoPrompt, imageUrl: results.find(r => r.status === 'completed')?.result_url, generating: generatingVideo, result: videoResult, onGenerate: (vp: string) => { setVideoPrompt(vp); handleGenerateVideoRef.current(); }, canGenerate: true, onDelete: deleteHandler } };
        }
        if (node.type === 'text') {
          const noteText = textNotes[node.id] || '';
          return { ...node, data: { text: noteText, onChange: (val: string) => setTextNotes(prev => ({ ...prev, [node.id]: val })), onDelete: deleteHandler } };
        }
        return node;
      })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brands, templates, selectedBrand, selectedTemplate, referenceFiles, imageNodeFiles, prompt, generating, results, numImages, videoPrompt, generatingVideo, videoResult, textNotes]);

  const nodeTypes = useMemo(() => ({
    brand: BrandNode,
    template: TemplateNode,
    references: ReferenceNode,
    image: ImageNode,
    prompt: PromptNode,
    generate: GenerateNode,
    video: VideoNode,
    text: TextNode,
    aiprompt: AIPromptNode,
  }), []);

  return (
    <div className="h-screen w-screen relative flex">
      {/* Node Palette - Left */}
      <NodePalette />

      {/* Main Area */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="toolbar !relative justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)] flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 text-[var(--accent)]" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-[var(--text-primary)]">Workflow</p>
              </div>
            </div>
            <div className="flex items-center gap-1 ml-2">
              <button
                onClick={() => setShowTemplates(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded-lg transition"
              >
                <LayoutTemplate className="w-3.5 h-3.5" />
                Templates
              </button>
              <button
                onClick={() => { if (confirm('Tạo workflow mới?')) { setNodes([]); setEdges([]); toast.success('New workflow'); } }}
                className="px-2.5 py-1.5 text-[12px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded-lg transition"
              >
                New
              </button>
              <button
                onClick={() => {
                  const workflow = { nodes, edges, savedAt: new Date().toISOString() };
                  localStorage.setItem('workflow_draft', JSON.stringify(workflow));
                  toast.success('Saved');
                }}
                className="px-2.5 py-1.5 text-[12px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded-lg transition"
              >
                Save
              </button>
            </div>
          </div>

          {/* Right - Run */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleRunFlow()}
              disabled={generating}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold transition-all ${
                !generating
                  ? 'bg-[var(--accent)] text-white hover:opacity-90'
                  : 'bg-[var(--accent-yellow)] text-black cursor-wait'
              }`}
            >
              {generating ? (
                <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Running</>
              ) : (
                <><Play className="w-3.5 h-3.5" /> Run</>
              )}
            </button>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onDragOver={onDragOver}
            onDrop={onDrop}
            onNodeContextMenu={onNodeContextMenu}
            onPaneClick={onPaneClick}
            isValidConnection={isValidConnection}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            minZoom={0.3}
            maxZoom={2}
            defaultEdgeOptions={{ animated: true, style: { strokeWidth: 2 } }}
            deleteKeyCode={['Backspace', 'Delete']}
            edgesFocusable={true}
            edgesUpdatable={true}
            selectNodesOnDrag={false}
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#cbd5e1" />
            <Controls showInteractive={false} />
            <MiniMap
              nodeColor={(node) => {
                const colors: Record<string, string> = {
                  brand: '#8b5cf6', template: '#3b82f6', references: '#f59e0b',
                  image: '#06b6d4', prompt: '#10b981', generate: '#6366f1',
                  video: '#e11d48', text: '#6b7280',
                };
                return colors[node.type || ''] || '#64748b';
              }}
              maskColor="rgba(248,250,252,0.7)"
            />
          </ReactFlow>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════ */}
      {/* RESULTS PANEL - Bên phải, hiện kết quả + sửa */}
      {/* ═══════════════════════════════════════════════ */}
      {showResults && (
        <>
          <div className="fixed inset-0 bg-black/20 z-40" onClick={() => setShowResults(false)} />
          <div className="fixed inset-y-0 right-0 w-96 bg-white border-l border-gray-200 shadow-2xl z-50 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900">
                Kết quả ({results.length} hình)
              </h3>
              <button onClick={() => setShowResults(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Results List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {generating && results.length === 0 && (
                <div className="text-center py-12">
                  <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mx-auto" />
                  <p className="text-sm text-gray-500 mt-3">Đang tạo {numImages} hình ảnh...</p>
                  <p className="text-xs text-gray-400 mt-1">Có thể mất 30-60 giây</p>
                </div>
              )}

              {results.map((result, index) => (
                <div key={index} className="rounded-xl border border-gray-200 overflow-hidden">
                  {/* Image */}
                  {result.status === 'completed' && result.result_url ? (
                    <div className="relative group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={result.result_url} alt={`Result ${index + 1}`} className="w-full" />
                      {/* Overlay actions */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                        <a href={result.result_url} target="_blank" rel="noreferrer" className="p-2 bg-white rounded-lg shadow-sm hover:bg-gray-100">
                          <Download className="w-4 h-4 text-gray-700" />
                        </a>
                        <button onClick={() => { setEditingIndex(index); setEditPrompt(result.prompt || prompt); }} className="p-2 bg-white rounded-lg shadow-sm hover:bg-gray-100">
                          <Edit3 className="w-4 h-4 text-gray-700" />
                        </button>
                        <button onClick={() => handleRegenerate(index)} className="p-2 bg-white rounded-lg shadow-sm hover:bg-gray-100">
                          <RefreshCw className="w-4 h-4 text-gray-700" />
                        </button>
                      </div>
                    </div>
                  ) : result.status === 'processing' || result.status === 'pending' ? (
                    <div className="h-48 bg-gray-100 flex items-center justify-center">
                      <div className="text-center">
                        <RefreshCw className="w-6 h-6 text-indigo-400 animate-spin mx-auto" />
                        <p className="text-xs text-gray-400 mt-2">Đang xử lý...</p>
                      </div>
                    </div>
                  ) : (
                    <div className="h-32 bg-red-50 flex items-center justify-center">
                      <p className="text-xs text-red-500">❌ {result.error_message || 'Thất bại'}</p>
                    </div>
                  )}

                  {/* Actions bar */}
                  <div className="px-3 py-2 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-[10px] text-gray-400">#{index + 1}</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => { setEditingIndex(index); setEditPrompt(result.prompt || prompt); }}
                        className="text-[10px] text-indigo-600 hover:text-indigo-700 flex items-center gap-0.5"
                      >
                        <Edit3 className="w-3 h-3" /> Sửa prompt
                      </button>
                      <span className="text-gray-300">|</span>
                      <button
                        onClick={() => handleRegenerate(index)}
                        className="text-[10px] text-emerald-600 hover:text-emerald-700 flex items-center gap-0.5"
                      >
                        <RefreshCw className="w-3 h-3" /> Tạo lại
                      </button>
                    </div>
                  </div>

                  {/* Edit prompt inline */}
                  {editingIndex === index && (
                    <div className="px-3 py-2 border-t border-gray-200 bg-indigo-50 space-y-2">
                      <textarea
                        value={editPrompt}
                        onChange={e => setEditPrompt(e.target.value)}
                        className="w-full px-2 py-1.5 text-xs rounded border border-indigo-200 focus:border-indigo-400 outline-none resize-none"
                        rows={3}
                        placeholder="Sửa prompt rồi tạo lại..."
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleRegenerate(index, editPrompt)}
                          className="flex-1 text-xs bg-indigo-600 text-white py-1.5 rounded hover:bg-indigo-700 font-medium"
                        >
                          Tạo lại với prompt mới
                        </button>
                        <button
                          onClick={() => { setEditingIndex(null); setEditPrompt(''); }}
                          className="text-xs text-gray-500 py-1.5 px-2 rounded hover:bg-gray-200"
                        >
                          Huỷ
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Footer - Regenerate All */}
            {results.length > 0 && (
              <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
                <button
                  onClick={() => handleRunFlow()}
                  disabled={generating}
                  className="w-full flex items-center justify-center gap-2 py-2 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${generating ? 'animate-spin' : ''}`} />
                  Tạo lại tất cả ({numImages} hình)
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <>
          <div className="fixed inset-0 z-50" onClick={() => setContextMenu(null)} />
          <div className="fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 py-1 min-w-[140px]" style={{ top: contextMenu.y, left: contextMenu.x }}>
            <button onClick={() => deleteNode(contextMenu.nodeId)} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors">
              <Trash2 className="w-3.5 h-3.5" /> Xóa node
            </button>
          </div>
        </>
      )}

      {/* Side Panel - Create brand/template */}
      {sidePanel && (
        <SidePanel
          type={sidePanel}
          onClose={() => setSidePanel(null)}
          onBrandCreated={(brand) => { setBrands(prev => [...prev, brand]); setSelectedBrand(brand); setSidePanel(null); }}
          onTemplateCreated={(tpl) => { setTemplates(prev => [...prev, tpl]); setSelectedTemplate(tpl); setSidePanel(null); }}
        />
      )}

      {/* Workflow Templates Modal */}
      <WorkflowTemplatesModal
        open={showTemplates}
        onClose={() => setShowTemplates(false)}
        onSelect={(template: WorkflowTemplate) => {
          // Load template nodes and edges
          setNodes(template.nodes);
          setEdges(template.edges);
          setShowTemplates(false);
          toast.success(`Loaded: ${template.name}`);
        }}
      />

      {/* Edit Brand Modal */}
      {editingBrand && (
        <EditBrandModal
          brand={editingBrand}
          onClose={() => setEditingBrand(null)}
          onSave={async (updatedBrand) => {
            setBrands(prev => prev.map(b => b.id === updatedBrand.id ? updatedBrand : b));
            if (selectedBrand?.id === updatedBrand.id) setSelectedBrand(updatedBrand);
            setEditingBrand(null);
            toast.success('Đã cập nhật brand');
          }}
        />
      )}
    </div>
  );
}

// Edit Brand Modal Component
function EditBrandModal({ brand, onClose, onSave }: { brand: Brand; onClose: () => void; onSave: (brand: Brand) => void }) {
  const [name, setName] = useState(brand.name);
  const [primaryColor, setPrimaryColor] = useState(brand.primary_color);
  const [secondaryColor, setSecondaryColor] = useState(brand.secondary_color || '');
  const [logoUrl, setLogoUrl] = useState(brand.logo_url || '');
  const [description, setDescription] = useState(brand.description || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) { toast.error('Nhập tên brand'); return; }
    setSaving(true);
    try {
      const { updateBrand } = await import('@/lib/api');
      const updated = await updateBrand(brand.id, {
        name: name.trim(),
        primary_color: primaryColor,
        secondary_color: secondaryColor || undefined,
        logo_url: logoUrl || undefined,
        description: description || undefined,
      });
      onSave(updated);
    } catch { toast.error('Lỗi cập nhật'); }
    finally { setSaving(false); }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { uploadFile } = await import('@/lib/api');
      const { url } = await uploadFile(file);
      setLogoUrl(url);
      toast.success('Đã upload logo');
    } catch { toast.error('Lỗi upload'); }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/60" onClick={onClose} />
      <div className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] rounded-xl overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Sửa Brand</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-[var(--bg-hover)]" style={{ color: 'var(--text-tertiary)' }}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          {/* Logo */}
          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>Logo</label>
            <div className="flex items-center gap-3">
              {logoUrl ? (
                <img src={logoUrl} alt="" className="w-12 h-12 rounded-lg object-cover" style={{ border: '1px solid var(--border)' }} />
              ) : (
                <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: primaryColor, border: '1px solid var(--border)' }}>
                  <span className="text-white text-lg font-bold">{name.charAt(0)}</span>
                </div>
              )}
              <label className="px-3 py-1.5 text-xs font-medium rounded-lg cursor-pointer" style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>
                Đổi logo
                <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
              </label>
            </div>
          </div>
          {/* Name */}
          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>Tên brand *</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
          </div>
          {/* Colors */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>Màu chính</label>
              <div className="flex items-center gap-2">
                <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer" />
                <input type="text" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="flex-1 px-2 py-1.5 rounded text-xs font-mono outline-none" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>Màu phụ</label>
              <div className="flex items-center gap-2">
                <input type="color" value={secondaryColor || '#888888'} onChange={e => setSecondaryColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer" />
                <input type="text" value={secondaryColor} onChange={e => setSecondaryColor(e.target.value)} placeholder="#888888" className="flex-1 px-2 py-1.5 rounded text-xs font-mono outline-none" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
              </div>
            </div>
          </div>
          {/* Description */}
          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>Mô tả</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Mô tả ngắn về brand..." className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-4" style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-lg" style={{ color: 'var(--text-secondary)' }}>Hủy</button>
          <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm font-medium rounded-lg disabled:opacity-50" style={{ background: 'var(--accent)', color: 'white' }}>
            {saving ? 'Đang lưu...' : 'Lưu'}
          </button>
        </div>
      </div>
    </>
  );
}

export default function WorkflowPage() {
  return (
    <ReactFlowProvider>
      <WorkflowCanvas />
    </ReactFlowProvider>
  );
}
