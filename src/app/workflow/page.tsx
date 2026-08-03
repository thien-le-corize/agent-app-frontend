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

import { BrandNode, TemplateNode, ReferenceNode, ImageNode, PromptNode, GenerateNode, VideoNode, TextNode, AIPromptNode, InputImageNode, LayoutNode, StoryboardNode, StoryboardImageNode, layoutConfigToPrompt } from '@/components/nodes';
import NodePalette from '@/components/NodePalette';
import WorkflowTemplatesModal, { WorkflowTemplate } from '@/components/WorkflowTemplatesModal';
import { getBrands, getTemplates, generateImage, generateVideo, getVideoGeneration, uploadFile, generateAIPrompt, generateVideoStoryboard, analyzeReferenceStructure, analyzeBrandAsset, updateBrand, getProjects, createProject, updateProject } from '@/lib/api';
import type { ReferenceStructureAnalysis } from '@/lib/api';
import { Brand, Template, ImageGeneration, VideoGeneration, Project } from '@/types';
import { Sparkles, Play, Trash2, X, RefreshCw, Download, Edit3, ImageIcon, FolderOpen, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import SidePanel from '@/components/SidePanel';

// ═══════════════════════════════════════════════
// CONNECTION RULES - ComfyUI style: tự do nối, nhiều node cùng loại
// ═══════════════════════════════════════════════
const CONNECTION_RULES: Record<string, string[]> = {
  brand: ['template', 'references', 'image', 'prompt', 'generate', 'aiprompt'],
  template: ['prompt', 'generate', 'aiprompt'],
  references: ['prompt', 'generate', 'image', 'aiprompt', 'storyboard'],
  image: ['prompt', 'generate', 'image', 'video', 'aiprompt', 'storyboard'],
  input: ['prompt', 'generate', 'aiprompt', 'storyboard'],
  prompt: ['generate', 'video', 'prompt', 'storyboard'],
  generate: ['video', 'generate', 'image', 'prompt'],
  video: ['video'],
  text: ['brand', 'template', 'references', 'image', 'input', 'prompt', 'generate', 'video', 'text', 'aiprompt', 'storyboard', 'storyboardImage'],
  aiprompt: ['generate', 'prompt', 'video', 'storyboard'],
  storyboard: ['video', 'prompt', 'storyboardImage'],
  storyboardImage: ['video'],
};

const initialNodes: Node[] = [
  { id: 'brand-1', type: 'brand', position: { x: 40, y: 40 }, data: {} },
  { id: 'input-1', type: 'input', position: { x: 40, y: 255 }, data: { label: 'Ảnh đầu vào' } },
  { id: 'references-1', type: 'references', position: { x: 360, y: 135 }, data: {} },
  { id: 'prompt-1', type: 'prompt', position: { x: 360, y: 380 }, data: {}, style: { width: 360, height: 240 } },
  { id: 'generate-1', type: 'generate', position: { x: 745, y: 180 }, data: {} },
];

const initialEdges: Edge[] = [
  { id: 'e-brand-prompt', source: 'brand-1', target: 'prompt-1', animated: true },
  { id: 'e-input-prompt', source: 'input-1', target: 'prompt-1', animated: true },
  { id: 'e-reference-prompt', source: 'references-1', target: 'prompt-1', animated: true },
  { id: 'e-prompt-generate-1', source: 'prompt-1', target: 'generate-1', animated: true },
];

function getInitialWorkflow() {
  return {
    nodes: initialNodes.map((node) => ({ ...node, data: { ...node.data }, position: { ...node.position }, style: node.style ? { ...node.style } : undefined })),
    edges: initialEdges.map((edge) => ({ ...edge })),
  };
}

function getDefaultNodeStyle(type: string) {
  if (type === 'prompt') return { width: 360, height: 240 };
  return undefined;
}

function buildBrandPaletteInstruction(brand?: Brand | null) {
  if (!brand) {
    return '- Chưa chọn brand. Nếu có brand, dùng màu brand thay palette cũ của ảnh tham khảo.';
  }

  return [
    `- Brand: ${brand.name}`,
    `- Primary: ${brand.primary_color || 'không rõ'}`,
    `- Secondary: ${brand.secondary_color || brand.primary_color || 'không rõ'}`,
    `- Logo: ${brand.logo_url ? 'logo brand đã được cung cấp, dùng để thay logo cũ' : 'chưa có logo'}`,
    brand.description ? `- Font/nhận diện: ${brand.description}` : '',
  ].filter(Boolean).join('\n');
}

function buildPromptFromReferenceAnalysis(analysis: ReferenceStructureAnalysis, brand?: Brand | null) {
  const layout = Object.entries(analysis.layout || {}).map(([key, value]) => `- ${key}: ${value}`).join('\n');
  const colors = Object.entries(analysis.colors || {}).map(([key, value]) => `- ${key}: ${value}`).join('\n');
  const colorReplacements = (analysis.colorReplacements || []).map((item, index) =>
    `${index + 1}. ${item.originalColor || 'màu tham khảo'} (${item.originalUsage || 'không rõ'}) -> ${item.replaceWith || item.brandRole || 'màu brand phù hợp'}: ${item.note || 'đổi sang palette brand'}`
  ).join('\n');
  const productSlots = (analysis.productSlots || []).map((item, index) =>
    `${index + 1}. [${item.role || 'product'} | ${item.position || 'không rõ'} | ${item.size || 'không rõ'}]\nSản phẩm cũ: ${item.description || 'không rõ'}\nThay bằng ảnh đầu vào: ${item.shouldReplaceWithInput === false ? 'không bắt buộc' : 'bắt buộc'}\nCách thay: ${item.replacementInstruction || 'Giữ vị trí/kích thước/perspective/ánh sáng của slot, thay sản phẩm cũ bằng sản phẩm từ ảnh đầu vào.'}`
  ).join('\n\n');
  const style = Object.entries(analysis.style || {}).map(([key, value]) => `- ${key}: ${value}`).join('\n');
  const texts = (analysis.textItems || []).map((item, index) =>
    `${index + 1}. [${item.role || 'text'} | ${item.position || 'không rõ'}]\nOCR cũ: ${item.originalText || 'không rõ'}\nText mới: ${item.suggestedText || ''}`
  ).join('\n\n');

  return `${analysis.prompt || 'Tạo quảng cáo nha khoa chuyên nghiệp dựa trên ảnh tham khảo.'}

[Bố cục đã quét]
${layout || '- Giữ bố cục chính từ ảnh tham khảo.'}

[Màu sắc đã quét]
${colors || '- Giữ màu sắc chính từ ảnh tham khảo.'}

[Brand palette bắt buộc]
${buildBrandPaletteInstruction(brand)}

[Thay màu reference sang brand]
- Kiểm tra tất cả màu design trong ảnh tham khảo: background, gradient, headline, subheadline, CTA, badge, icon, border, decoration, footer, shadow/tint.
- Kiểm tra cả màu chữ lớn/display typography/tên dịch vụ hoặc sản phẩm trong ảnh tham khảo. Ví dụ chữ headline/product name màu vàng/gold phải đổi sang màu brand, không giữ màu cũ.
- Thay toàn bộ palette cũ của ảnh tham khảo bằng màu brand tương ứng. Không giữ màu chính/phụ/nhấn cũ nếu khác brand.
- Headline, product/service name, chữ display lớn dùng brand primary hoặc secondary; CTA/badge/icon dùng primary/accent; text nhỏ dùng màu dễ đọc theo brand.
- Chỉ giữ trắng/đen/xám trung tính và màu tự nhiên của ảnh người/sản phẩm khi cần.
${colorReplacements || '- Map màu nền/gradient sang màu brand nền/phụ, CTA/badge/icon sang primary/accent, headline/display text/product name sang primary hoặc secondary của brand.'}

[Sản phẩm chính trong ảnh tham khảo]
${productSlots || '- Nếu ảnh tham khảo có sản phẩm/mockup/vật thể chính, dùng ảnh đầu vào để thay sản phẩm cũ trong đúng vị trí đó.'}
- Khi có node Ảnh đầu vào nối vào workflow, sản phẩm/người/vật thể từ ảnh đầu vào là bắt buộc. Không giữ sản phẩm cũ từ ảnh tham khảo.
- Giữ bố cục slot sản phẩm: vị trí, kích thước, phối cảnh, ánh sáng, bóng đổ, khung tròn/card/badge xung quanh nếu có.
- Nếu ảnh đầu vào là sản phẩm, thay product slot. Nếu ảnh đầu vào là người mẫu, thay subject/person slot. Nếu có nhiều ảnh đầu vào, dùng ảnh phù hợp nhất cho từng slot.

[Text cần thay]
${texts || '- Thay toàn bộ text cũ bằng nội dung mới từ prompt người dùng.'}

[Style]
${style || '- Quảng cáo chuyên nghiệp, sạch, phù hợp nha khoa.'}

Yêu cầu bắt buộc: thay toàn bộ text cũ bằng các text mới ở trên, giữ hierarchy/vị trí tương ứng, output chuyên nghiệp, trang phục kín đáo, non-sexual.
Ngôn ngữ bắt buộc: mọi chữ hiển thị trong ảnh cuối phải là tiếng Việt có dấu, tự nhiên, đúng chính tả. Không dùng tiếng Anh trong headline, CTA, badge, footer, ưu đãi, địa chỉ, caption hoặc bất kỳ text overlay nào.`;
}

function composePrompt(scannedPrompt: string, extraPrompt: string) {
  const scanned = scannedPrompt.trim();
  const extra = extraPrompt.trim();

  if (!scanned) return extra;
  if (!extra) return scanned;

  return `${scanned}

[Prompt thêm của người dùng]
${extra}`;
}

function normalizeWorkflowDraft(workflow: any) {
  const fallback = getInitialWorkflow();
  if (!workflow || !Array.isArray(workflow.nodes) || workflow.nodes.length === 0) {
    return { ...fallback, scannedPrompt: '' };
  }

  return {
    nodes: workflow.nodes,
    edges: Array.isArray(workflow.edges) ? workflow.edges : [],
    scannedPrompt: typeof workflow.scannedPrompt === 'string' ? workflow.scannedPrompt : '',
  };
}

function removeGeneratedBrandAnalysis(description?: string | null) {
  return (description || '')
    .split('\n')
    .filter((line) => !/^(Font|Font detail|Font prompt|Style):/i.test(line.trim()))
    .join('\n')
    .trim();
}

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

function getUpstreamNodes(targetId: string, edges: Edge[], allNodes: Node[]): Node[] {
  const byId = new Map(allNodes.map((node) => [node.id, node]));
  const visited = new Set<string>();
  const result: Node[] = [];

  function visit(nodeId: string) {
    const incomingEdges = edges.filter((edge) => edge.target === nodeId);
    for (const edge of incomingEdges) {
      if (visited.has(edge.source)) continue;
      visited.add(edge.source);
      const sourceNode = byId.get(edge.source);
      if (!sourceNode) continue;
      result.push(sourceNode);
      visit(sourceNode.id);
    }
  }

  visit(targetId);
  return result;
}

function appendUnique(target: string[], urls: string[]) {
  for (const url of urls) {
    if (url && !target.includes(url)) target.push(url);
  }
}

function getStoryboardImageUrl(
  node: Node,
  runtimeStoryboardImages: Record<string, string[]>,
  savedStoryboardImages: Record<string, string[]>,
) {
  const nodeData = node.data as any;
  const sourceStoryboardId = nodeData?.sourceStoryboardId;
  const index = typeof nodeData?.index === 'number' ? nodeData.index : 0;
  if (sourceStoryboardId) {
    return runtimeStoryboardImages[sourceStoryboardId]?.[index]
      || savedStoryboardImages[sourceStoryboardId]?.[index]
      || nodeData?.imageUrl
      || '';
  }
  return nodeData?.imageUrl || '';
}

function buildStoryboardReferenceImagePrompt(script: string, frameIndex: number, totalFrames: number) {
  if (totalFrames === 1) {
    return `[Full video storyboard sheet <FIRST_FRAME>]
Create ONE single polished storyboard/contact-sheet image for a Google Omni video workflow.
The image must contain the entire 0-10 second video plan in one visual storyboard sheet.
The output should feel like a TVC commercial plan: strong opening hook, product/service benefit, brand/product hero moment, and concise CTA.
Input references may contain a product, a human subject/model, or both.

[Full approved script]
${script}

[Storyboard sheet requirement]
- Create a clean storyboard sheet inside one image with up to 6 panels/keyframes, preferably a 2x3 grid.
- The panels should cover the full 0-10 second video: opening, first action, development, detail/reaction, climax/CTA, closing.
- If the script is very simple, use fewer panels, but never more than 6.
- Each panel must show a different moment from the script with consistent subject identity, wardrobe, setting style, lighting, and color grade.
- Use cinematic composition, clear subject placement, and readable visual progression from left to right, top to bottom.
- Keep subject and wardrobe continuity from the input image references across all panels.
- Do not redesign the subject, wardrobe, accessories, makeup, or distinctive styling details.
- Preserve the original outfit exactly. Do not redesign clothing, do not change uniforms, and do not make the clothing more formal/casual unless the user explicitly asks.
- If the input contains a product/object, preserve its shape, material, label, logo, packaging, color, scale, surface texture, and key details exactly.
- If both product and person are provided, show a natural TVC relationship between the person and product/service without changing either identity.
- Avoid large text overlays unless the script explicitly requires them; if labels are used, keep them small and inside safe margins.
- Natural photography look for any human subject: raw photo, 35mm photograph, shot on Sony A7IV, natural lighting, subsurface scattering, real skin texture, fine pores, subtle imperfections, gentle film grain.
- Avoid artificial beauty/render keywords and effects: no hyperrealistic, no 8k, no cinematic lighting, no masterpiece, no smooth skin, no waxy/plastic skin, no harsh 3D/game lighting.
- Avoid ID-card/passport-photo stiffness. Each person should have a slight lived-in motion pose when appropriate to the script: small head tilt, relaxed shoulder shift, natural hand gesture, or mouth slightly open as if speaking softly.
- Professional TVC advertising style, realistic natural lighting, clean composition, family-safe, modest, non-sexual.`;
  }

  const start = frameIndex === 0 ? '<FIRST_FRAME>' : `<IMAGE_REF_${frameIndex - 1}>`;
  const timingStart = Math.round((frameIndex / totalFrames) * 8);
  const timingEnd = Math.round(((frameIndex + 1) / totalFrames) * 8);
  const segmentRole = frameIndex === 0
    ? 'Opening beat: establish the scene, main subject, wardrobe, environment, and starting action from <FIRST_FRAME>.'
    : frameIndex === totalFrames - 1
      ? 'Closing beat: show the final action, CTA/product/service emphasis, or resolved ending of the 10-second video.'
      : 'Development beat: show the main action, conversation, supporting subjects, product/prop detail, or closer reaction progressing naturally from the opening.';

  return `[Video reference frame ${frameIndex + 1}/${totalFrames} ${start}]
Create one polished cinematic reference image for a Google Omni video workflow.
This image represents ONLY the video segment from ${timingStart}s to ${timingEnd}s.
The frame should look like a premium TVC commercial still, not a poster. Input references may be product images, human subjects/models, or both.

[Segment for this reference image]
${segmentRole}
Use the full script below only as context, then extract the action, subject placement, camera angle, mood, and visual details that belong to this ${timingStart}-${timingEnd}s segment.
Do not illustrate the whole script in this image. Do not repeat the same composition as other reference images.

[Full approved script]
${script}

[Frame requirement]
- Make this frame visually distinct from the other frames.
- Subject continuity is mandatory: keep the same main subject styling and wardrobe continuity from the input image references across every reference frame.
- Do not redesign the subject, wardrobe, accessories, makeup, or distinctive styling details.
- Preserve the original outfit exactly. Do not redesign clothing, do not change uniforms, and do not make the clothing more formal/casual unless the user explicitly asks.
- Only change camera angle, pose, lighting, background, and scene action as needed for this script beat while keeping visual continuity.
- If the input contains a product/object, preserve its shape, material, label, logo, packaging, color, scale, surface texture, and key details exactly.
- If both product and person are provided, show the product naturally with the person when relevant to the TVC beat; do not replace either.
- Natural photography look for any human subject: raw photo, 35mm photograph, shot on Sony A7IV, natural lighting, subsurface scattering, real skin texture, fine pores, subtle imperfections, gentle film grain.
- Avoid artificial beauty/render keywords and effects: no hyperrealistic, no 8k, no cinematic lighting, no masterpiece, no smooth skin, no waxy/plastic skin, no harsh 3D/game lighting.
- Avoid ID-card/passport-photo stiffness. The person should feel caught mid-moment, with slight natural movement when appropriate: small head tilt, relaxed shoulder shift, natural hand gesture, or mouth slightly open as if speaking softly.
- Professional TVC advertising style, realistic natural lighting, clean product/subject composition.
- No text overlays unless the script explicitly requires readable text.
- Family-safe, modest styling, non-sexual, commercial-quality still frame.`;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForVideoGeneration(id: string): Promise<VideoGeneration> {
  for (let attempt = 0; attempt < 120; attempt++) {
    const video = await getVideoGeneration(id);
    if (video.status === 'completed' || video.status === 'failed') {
      return video;
    }
    await sleep(5000);
  }
  throw new Error('Timeout khi chờ Google Omni tạo video');
}

const GENERATE_VARIATION_PRESETS = [
  'Hero layout: place the main subject large on the right, promotional headline and offer on the left, strong medical-blue CTA band at the bottom.',
  'Magazine poster layout: place the main subject centered, use oversized discount typography behind/around the subject, with floating dental icons and clean white-blue negative space.',
  'Split composition: use a diagonal or curved divide, subject on one side, dental treatment/product visual on the other side, with compact benefit badges.',
  'Premium clinic layout: minimal white space, elegant typography, small brand header, subject cropped waist-up, treatment visual in a circular frame.',
  'Dynamic social ad layout: bold sticker-like sale badge, layered cards, motion accents, subject slightly off-center, stronger contrast and energetic composition.',
  'Trust-focused layout: subject near testimonial/benefit blocks, clear before-after/treatment module, restrained colors, clean healthcare credibility style.',
];

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
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [newProjectName, setNewProjectName] = useState('');
  const [creatingProject, setCreatingProject] = useState(false);
  const [autoCreatingBrandProjectId, setAutoCreatingBrandProjectId] = useState<string | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [referenceFiles, setReferenceFiles] = useState<File[]>([]);
  const [referenceLibraryUrls, setReferenceLibraryUrls] = useState<string[]>([]);
  const [referenceAnalysis, setReferenceAnalysis] = useState<ReferenceStructureAnalysis | null>(null);
  const [imageNodeFiles, setImageNodeFiles] = useState<Record<string, File[]>>({});
  const [imageNodeLibraryUrls, setImageNodeLibraryUrls] = useState<Record<string, string[]>>({});
  const [inputNodeFiles, setInputNodeFiles] = useState<Record<string, File[]>>({});
  const [inputNodeLibraryUrls, setInputNodeLibraryUrls] = useState<Record<string, string[]>>({});
  const [prompt, setPrompt] = useState('');
  const [scannedPrompt, setScannedPrompt] = useState('');
  const [analyzingReferencePrompt, setAnalyzingReferencePrompt] = useState(false);
  const [analyzingBrand, setAnalyzingBrand] = useState(false);
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
  const [videoOptions, setVideoOptions] = useState<Record<string, {
    aspectRatio: '16:9' | '9:16';
    durationSeconds: number;
    voiceStyle: string;
    videoStyle: 'tvc' | 'intro';
  }>>({});
  const [creatingStoryboardFromPrompt, setCreatingStoryboardFromPrompt] = useState<Record<string, boolean>>({});

  // Text notes
  const [textNotes, setTextNotes] = useState<Record<string, string>>({});
  const [layoutConfigs, setLayoutConfigs] = useState<Record<string, any>>({});
  const [storyboards, setStoryboards] = useState<Record<string, string>>({});
  const [storyboardImages, setStoryboardImages] = useState<Record<string, string[]>>({});

  // Context menu
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; nodeId: string } | null>(null);

  // Templates modal
  const [showTemplates, setShowTemplates] = useState(false);

  // Edit brand modal
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);

  const defaultWorkflow = useMemo(() => getInitialWorkflow(), []);
  const [nodes, setNodes, onNodesChange] = useNodesState(defaultWorkflow.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(defaultWorkflow.edges);
  const visibleProjects = useMemo(() => {
    if (!selectedBrand) return projects;
    return projects.filter((project) => project.brand_id === selectedBrand.id);
  }, [projects, selectedBrand]);

  const loadProjectWorkflow = useCallback((project: Project) => {
    const workflow = normalizeWorkflowDraft(project.workflow);
    setNodes(workflow.nodes);
    setEdges(workflow.edges);
    setScannedPrompt(workflow.scannedPrompt);
    setPrompt('');
    setResults([]);
    setVideoResult(null);
  }, [setNodes, setEdges]);

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

  const resetToDefaultWorkflow = useCallback(() => {
    const workflow = getInitialWorkflow();
    setNodes(workflow.nodes);
    setEdges(workflow.edges);
    setReferenceFiles([]);
    setReferenceLibraryUrls([]);
    setReferenceAnalysis(null);
    setImageNodeFiles({});
    setImageNodeLibraryUrls({});
    setInputNodeFiles({});
    setInputNodeLibraryUrls({});
    setPrompt('');
    setScannedPrompt('');
    setResults([]);
    setVideoResult(null);
    setVideoOptions({});
    setTextNotes({});
    setLayoutConfigs({});
    setStoryboards({});
    setStoryboardImages({});
    localStorage.removeItem('workflow_draft');
    toast.success('Đã tạo workflow mặc định');
  }, [setNodes, setEdges]);

  const buildCurrentWorkflowPayload = useCallback(() => ({
    nodes,
    edges,
    scannedPrompt,
    savedAt: new Date().toISOString(),
  }), [nodes, edges, scannedPrompt]);

  const handleSelectProject = useCallback((projectId: string) => {
    if (!selectedBrand) {
      toast.error('Chọn brand trước khi chọn dự án');
      return;
    }
    const project = projects.find((item) => item.id === projectId) || null;
    if (project && project.brand_id !== selectedBrand.id) {
      toast.error('Dự án này thuộc brand khác');
      return;
    }
    setSelectedProject(project);
    if (!project) return;
    localStorage.setItem('selected_project_id', project.id);
    loadProjectWorkflow(project);
  }, [projects, selectedBrand, loadProjectWorkflow]);

  const handleCreateProject = useCallback(async () => {
    const name = newProjectName.trim();
    if (!name || creatingProject) return;
    if (!selectedBrand) {
      toast.error('Chọn brand trước khi tạo dự án');
      return;
    }

    setCreatingProject(true);
    try {
      let initialWorkflow: Record<string, any> = { ...getInitialWorkflow(), scannedPrompt: '' };
      const legacyDraft = localStorage.getItem('workflow_draft');
      if (legacyDraft) {
        try {
          initialWorkflow = normalizeWorkflowDraft(JSON.parse(legacyDraft));
        } catch {}
      }

      const project = await createProject({
        name,
        brand_id: selectedBrand.id,
        workflow: initialWorkflow,
      });
      setProjects((prev) => [project, ...prev]);
      setSelectedProject(project);
      setNewProjectName('');
      localStorage.setItem('selected_project_id', project.id);
      localStorage.removeItem('workflow_draft');
      loadProjectWorkflow(project);
      toast.success('Đã tạo dự án');
    } catch (error) {
      console.error('Create project error:', error);
      toast.error('Tạo dự án thất bại');
    } finally {
      setCreatingProject(false);
    }
  }, [newProjectName, creatingProject, loadProjectWorkflow, selectedBrand?.id]);

  const handleSaveProjectWorkflow = useCallback(async () => {
    if (!selectedBrand) {
      toast.error('Chọn brand trước khi lưu workflow');
      return;
    }
    if (!selectedProject) {
      toast.error('Chọn dự án trước khi lưu workflow');
      return;
    }
    if (selectedProject.brand_id && selectedProject.brand_id !== selectedBrand.id) {
      toast.error('Dự án đang chọn thuộc brand khác');
      return;
    }

    try {
      const workflow = buildCurrentWorkflowPayload();
      const updated = await updateProject(selectedProject.id, {
        workflow,
        brand_id: selectedBrand.id,
      });
      setSelectedProject(updated);
      setProjects((prev) => prev.map((project) => project.id === updated.id ? updated : project));
      toast.success('Đã lưu workflow vào dự án');
    } catch (error) {
      console.error('Save project workflow error:', error);
      toast.error('Lưu workflow thất bại');
    }
  }, [selectedProject, selectedBrand, buildCurrentWorkflowPayload]);

  const onNodeContextMenu: NodeMouseHandler = useCallback((event, node) => {
    event.preventDefault();
    setContextMenu({ x: event.clientX, y: event.clientY, nodeId: node.id });
  }, []);

  const onPaneClick = useCallback(() => { setContextMenu(null); }, []);

  useEffect(() => {
    async function fetchData() {
      try {
        const [b, t, p] = await Promise.all([getBrands(), getTemplates(), getProjects()]);
        setBrands(b);
        setTemplates(t);
        setProjects(p);

        const savedProjectId = localStorage.getItem('selected_project_id');
        const initialProject = p.find((project) => project.id === savedProjectId) || p[0] || null;
        if (initialProject) {
          setSelectedProject(initialProject);
          loadProjectWorkflow(initialProject);
        }
      } catch (err) { console.error(err); }
    }
    fetchData();
  }, [loadProjectWorkflow]);

  useEffect(() => {
    if (!selectedBrand) return;
    if (selectedProject?.brand_id === selectedBrand.id) return;

    const matchingProject = projects.find((project) => project.brand_id === selectedBrand.id);
    if (matchingProject) {
      setSelectedProject(matchingProject);
      localStorage.setItem('selected_project_id', matchingProject.id);
      loadProjectWorkflow(matchingProject);
      return;
    }

    if (autoCreatingBrandProjectId === selectedBrand.id) return;

    const brand = selectedBrand;
    let cancelled = false;
    setAutoCreatingBrandProjectId(brand.id);

    async function createBrandProject() {
      try {
        const project = await createProject({
          name: `Dự án ${brand.name}`,
          brand_id: brand.id,
          workflow: buildCurrentWorkflowPayload(),
        });
        if (cancelled) return;
        setProjects((prev) => [project, ...prev]);
        setSelectedProject(project);
        localStorage.setItem('selected_project_id', project.id);
        loadProjectWorkflow(project);
        toast.success(`Đã tạo dự án riêng cho ${brand.name}`);
      } catch (error) {
        console.error('Create brand project error:', error);
        toast.error('Tạo dự án theo brand thất bại');
      } finally {
        if (!cancelled) setAutoCreatingBrandProjectId(null);
      }
    }

    createBrandProject();
    return () => {
      cancelled = true;
    };
  }, [
    selectedBrand,
    selectedProject?.brand_id,
    projects,
    autoCreatingBrandProjectId,
    buildCurrentWorkflowPayload,
    loadProjectWorkflow,
  ]);

  // ═══════════════════════════════════════════════
  // RUN FLOW - Nút chạy chính
  // ═══════════════════════════════════════════════
  // Refs to always get latest values in callbacks
  // ═══════════════════════════════════════════════
  const promptRef = useRef(prompt);
  promptRef.current = prompt;
  const scannedPromptRef = useRef(scannedPrompt);
  scannedPromptRef.current = scannedPrompt;
  const selectedBrandRef = useRef(selectedBrand);
  selectedBrandRef.current = selectedBrand;
  const selectedTemplateRef = useRef(selectedTemplate);
  selectedTemplateRef.current = selectedTemplate;
  const selectedProjectRef = useRef(selectedProject);
  selectedProjectRef.current = selectedProject;
  const referenceFilesRef = useRef(referenceFiles);
  referenceFilesRef.current = referenceFiles;
  const referenceLibraryUrlsRef = useRef(referenceLibraryUrls);
  referenceLibraryUrlsRef.current = referenceLibraryUrls;
  const imageNodeFilesRef = useRef(imageNodeFiles);
  imageNodeFilesRef.current = imageNodeFiles;
  const imageNodeLibraryUrlsRef = useRef(imageNodeLibraryUrls);
  imageNodeLibraryUrlsRef.current = imageNodeLibraryUrls;
  const inputNodeFilesRef = useRef(inputNodeFiles);
  inputNodeFilesRef.current = inputNodeFiles;
  const inputNodeLibraryUrlsRef = useRef(inputNodeLibraryUrls);
  inputNodeLibraryUrlsRef.current = inputNodeLibraryUrls;
  const textNotesRef = useRef(textNotes);
  textNotesRef.current = textNotes;
  const layoutConfigsRef = useRef(layoutConfigs);
  layoutConfigsRef.current = layoutConfigs;
  const storyboardsRef = useRef(storyboards);
  storyboardsRef.current = storyboards;
  const storyboardImagesRef = useRef(storyboardImages);
  storyboardImagesRef.current = storyboardImages;
  const videoOptionsRef = useRef(videoOptions);
  videoOptionsRef.current = videoOptions;

  const canRun = prompt.trim().length > 0 || scannedPrompt.trim().length > 0 || nodes.some((n) => n.type === 'aiprompt');

  const handleRunFlow = useCallback(async (count?: number) => {
    const currentProject = selectedProjectRef.current;
    const currentBrand = selectedBrandRef.current;
    if (!currentBrand) {
      toast.error('Chọn brand trước khi chạy workflow');
      return;
    }
    if (!currentProject) {
      toast.error('Tạo hoặc chọn dự án trước khi chạy workflow');
      return;
    }
    if (currentProject.brand_id !== currentBrand.id) {
      toast.error('Dự án đang chọn không thuộc brand hiện tại');
      return;
    }

    const currentPrompt = promptRef.current;
    const currentScannedPrompt = scannedPromptRef.current;
    const currentComposedPrompt = composePrompt(currentScannedPrompt, currentPrompt);
    const currentTemplate = selectedTemplateRef.current;
    const currentFiles = referenceFilesRef.current;
    const currentImageFiles = imageNodeFilesRef.current;
    const referenceLibraryUrls = referenceLibraryUrlsRef.current;
    const imageNodeLibraryUrls = imageNodeLibraryUrlsRef.current;
    const inputNodeFiles = inputNodeFilesRef.current;
    const inputNodeLibraryUrls = inputNodeLibraryUrlsRef.current;
    const currentTextNotes = textNotesRef.current;
    const currentLayoutConfigs = layoutConfigsRef.current;
    const currentStoryboards = storyboardsRef.current;
    const currentStoryboardImages = storyboardImagesRef.current;
    const currentVideoOptions = videoOptionsRef.current;

    // Cho phép chạy nếu có node aiprompt (AI sẽ tự tạo prompt) hoặc có prompt node với text
    const hasAIPromptNode = nodes.some((n) => n.type === 'aiprompt');
    const hasPromptNodeWithText = nodes.some((n) => n.type === 'prompt' && (n.data as any)?.prompt?.trim());
    if (!currentComposedPrompt.trim() && !hasAIPromptNode && !hasPromptNodeWithText) { 
      toast.error('Nhập prompt thêm hoặc quét prompt từ ảnh tham khảo'); 
      return; 
    }

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
      const aiPromptNodes = nodes.filter((n) => n.type === 'aiprompt' && connectedNodeIds.has(n.id));
      const storyboardNodes = nodes.filter((n) => n.type === 'storyboard' && connectedNodeIds.has(n.id));
      const storyboardImageNodes = nodes.filter((n) => n.type === 'storyboardImage' && connectedNodeIds.has(n.id));
      const executableNodes = [...aiPromptNodes, ...storyboardNodes, ...storyboardImageNodes, ...generateNodes];

      if (executableNodes.length === 0) {
        toast.error('Thêm node Ảnh Storybook hoặc Generate vào flow. Video chỉ chạy khi bấm Tạo Video.');
        setGenerating(false);
        return;
      }

      // 2. Topological sort
      const sorted = topologicalSort(executableNodes, edges, nodes);
      console.log('[Flow] Execution order:', sorted.map(n => `${n.type}(${n.id})`));

      // 3. Execute từng node theo thứ tự
      const nodeResults: Record<string, string> = {}; // nodeId -> result URL
      const runtimeStoryboardImages: Record<string, string[]> = {};
      const allResults: ImageGeneration[] = [];
      const processedStoryboardImageNodes = new Set<string>();

      for (const execNode of sorted) {
        if (execNode.type === 'storyboardImage' && processedStoryboardImageNodes.has(execNode.id)) {
          continue;
        }
        console.log(`[Flow] Executing: ${execNode.type}(${execNode.id})`);

        // Update node status → running
        setNodes((nds) => nds.map((n) => n.id === execNode.id ? { ...n, data: { ...n.data, status: 'running', generating: true } } : n));

        // Tìm toàn bộ inputs upstream cho node này.
        // Hỗ trợ nhiều ảnh đi qua nhiều node trung gian: Image/Input/References → ... → Generate.
        const allInputNodes = getUpstreamNodes(execNode.id, edges, nodes);

        // Collect data từ input nodes
        let nodePrompt = currentComposedPrompt;
        let refImages: string[] = [];
        let inputImages: string[] = [];
        let styleReferenceImages: string[] = [];

        for (const inp of allInputNodes) {
          if (!inp) continue;
          if (inp.type === 'prompt') {
            // Lấy prompt từ PromptNode data
            const promptNodeData = inp.data as any;
            const promptExtra = promptNodeData?.prompt?.trim() || '';
            if (promptNodeData?.prompt && promptNodeData.prompt.trim()) {
              nodePrompt = composePrompt(currentScannedPrompt, promptExtra);
            }
            // Cũng check xem có aiprompt nối vào nó không
            const promptInputEdges = edges.filter((e) => e.target === inp.id);
            for (const pe of promptInputEdges) {
              if (nodeResults[pe.source]) {
                nodePrompt = composePrompt(nodeResults[pe.source], promptExtra);
                break;
              }
            }
          } else if (inp.type === 'aiprompt') {
            // Trực tiếp từ AI Prompt node
            if (nodeResults[inp.id]) {
              nodePrompt = nodeResults[inp.id];
            }
          } else if (inp.type === 'storyboard') {
            if (nodeResults[inp.id]) {
              nodePrompt = nodeResults[inp.id];
            } else if (currentStoryboards[inp.id]?.trim()) {
              nodePrompt = currentStoryboards[inp.id];
            }
          } else if (inp.type === 'text') {
            const noteText = currentTextNotes[inp.id]?.trim();
            if (noteText) {
              nodePrompt += `\n\n[Text node instruction]\n${noteText}`;
            }
          } else if (inp.type === 'layout') {
            const layoutPrompt = layoutConfigToPrompt(currentLayoutConfigs[inp.id] || (inp.data as any)?.config || {});
            nodePrompt += `\n\n[Image layout node]\n${layoutPrompt}`;
          } else if (inp.type === 'image') {
            // Upload files từ image node + dùng libraryUrls trực tiếp
            const files = currentImageFiles[inp.id] || [];
            const libUrls = imageNodeLibraryUrls[inp.id] || [];
            console.log(`[Flow] Image node ${inp.id}: ${files.length} files, ${libUrls.length} library URLs`);
            appendUnique(refImages, libUrls);
            appendUnique(inputImages, libUrls);
            for (const file of files) {
              const { url } = await uploadFile(file);
              appendUnique(refImages, [url]);
              appendUnique(inputImages, [url]);
              console.log(`[Flow] Uploaded image: ${url.slice(0, 60)}`);
            }
          } else if (inp.type === 'input') {
            // Input Image node — ghép trực tiếp vào output
            const files = inputNodeFiles[inp.id] || [];
            const libUrls = inputNodeLibraryUrls[inp.id] || [];
            console.log(`[Flow] Input node ${inp.id}: ${files.length} files, ${libUrls.length} library URLs`);
            appendUnique(refImages, libUrls);
            appendUnique(inputImages, libUrls);
            for (const file of files) {
              const { url } = await uploadFile(file);
              appendUnique(refImages, [url]);
              appendUnique(inputImages, [url]);
            }
          } else if (inp.type === 'references') {
            // Library URLs đã có trên server
            const libUrls = referenceLibraryUrls || [];
            appendUnique(refImages, libUrls);
            appendUnique(styleReferenceImages, libUrls);
            for (const file of currentFiles) {
              const { url } = await uploadFile(file);
              appendUnique(refImages, [url]);
              appendUnique(styleReferenceImages, [url]);
            }
          } else if (inp.type === 'generate') {
            // Output từ node generate trước → dùng làm input image
            if (nodeResults[inp.id]) {
              appendUnique(refImages, [nodeResults[inp.id]]);
              appendUnique(inputImages, [nodeResults[inp.id]]);
            }
          } else if (inp.type === 'storyboardImage') {
            const storyboardImageUrl = getStoryboardImageUrl(inp, runtimeStoryboardImages, currentStoryboardImages);
            appendUnique(refImages, [storyboardImageUrl]);
            appendUnique(inputImages, [storyboardImageUrl]);
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
          const nodeDescription = nodeData.description || currentPrompt || 'Banner quảng cáo chuyên nghiệp';
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
              description: `${nodeDescription}\n\nBắt buộc mọi chữ xuất hiện trong ảnh là tiếng Việt có dấu, không dùng tiếng Anh.`,
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

        } else if (execNode.type === 'storyboard') {
          let storyboardImageUrls = [...refImages].slice(0, 3);
          const savedStoryboard = currentStoryboards[execNode.id]?.trim();

          if (savedStoryboard) {
            nodeResults[execNode.id] = savedStoryboard;
            runtimeStoryboardImages[execNode.id] = currentStoryboardImages[execNode.id] || storyboardImageUrls;
            setNodes((nds) => nds.map((n) => n.id === execNode.id ? { ...n, data: { ...n.data, storyboard: savedStoryboard, imageUrls: runtimeStoryboardImages[execNode.id], status: 'done', generating: false } } : n));
            continue;
          }

          toast('Đang tạo storybook theo từng ảnh...', { icon: '🎬' });
          const { storyboard } = await generateVideoStoryboard({
              script: nodePrompt || 'Tạo video quảng cáo nha khoa chuyên nghiệp từ ảnh đầu vào.',
            image_urls: storyboardImageUrls.length > 0 ? storyboardImageUrls : undefined,
          });

          nodeResults[execNode.id] = storyboard;
          runtimeStoryboardImages[execNode.id] = storyboardImageUrls;
          setStoryboards((prev) => ({ ...prev, [execNode.id]: storyboard }));
          setStoryboardImages((prev) => ({ ...prev, [execNode.id]: storyboardImageUrls }));
          setNodes((nds) => nds.map((n) => n.id === execNode.id ? { ...n, data: { ...n.data, storyboard, imageUrls: storyboardImageUrls, status: 'done', generating: false } } : n));
          toast.success('✅ Storybook xong');
        } else if (execNode.type === 'storyboardImage') {
          let script = nodeResults.__video_script || currentComposedPrompt;
          const totalFrames = Math.max(storyboardImageNodes.length, 1);
          const batchNodes = storyboardImageNodes.filter((node) => !processedStoryboardImageNodes.has(node.id));

          if (!nodeResults.__video_script) {
            toast('Đang tự viết kịch bản video...', { icon: '🎬' });
            const { storyboard } = await generateVideoStoryboard({
              script: nodePrompt || currentComposedPrompt || 'Tạo video quảng cáo nha khoa chuyên nghiệp từ ảnh đầu vào.',
              image_urls: refImages.length > 0 ? refImages.slice(0, 3) : undefined,
            });
            script = storyboard;
            nodeResults.__video_script = storyboard;
            setPrompt(storyboard);
            toast.success('Đã đưa kịch bản vào Prompt');
          }

          batchNodes.forEach((node) => processedStoryboardImageNodes.add(node.id));
          setNodes((nds) => nds.map((node) => batchNodes.some((batchNode) => batchNode.id === node.id)
            ? { ...node, data: { ...node.data, status: 'running', generating: true } }
            : node
          ));

          toast(`Đang tạo ${batchNodes.length} ảnh tham chiếu cùng lúc...`, { icon: '🖼️' });
          const batchResults = await Promise.all(batchNodes.map(async (node) => {
            const frameIndex = typeof (node.data as any)?.index === 'number'
              ? (node.data as any).index
              : storyboardImageNodes.findIndex((candidate) => candidate.id === node.id);
            const referencePrompt = buildStoryboardReferenceImagePrompt(script, frameIndex, totalFrames);
            const res = await generateImage({
              project_id: currentProject.id,
              ...(currentBrand?.id ? { brand_id: currentBrand.id } : {}),
              user_input: referencePrompt,
              reference_images: refImages.length > 0 ? refImages.slice(0, 3) : undefined,
              input_images: inputImages.length > 0 ? inputImages.slice(0, 3) : undefined,
              variation_index: frameIndex + 1,
            });

            return { node, frameIndex, referencePrompt, res };
          }));

          for (const item of batchResults) {
            if (item.res.status === 'failed' || !item.res.result_url) {
              setNodes((nds) => nds.map((node) => node.id === item.node.id
                ? { ...node, data: { ...node.data, status: 'error', generating: false, result: item.res } }
                : node
              ));
              continue;
            }

            nodeResults[item.node.id] = item.res.result_url;
            allResults.push(item.res);
            setNodes((nds) => nds.map((node) => node.id === item.node.id
              ? { ...node, data: { ...node.data, imageUrl: item.res.result_url, prompt: item.referencePrompt, status: 'done', generating: false, result: item.res } }
              : node
            ));
          }

          const failedCount = batchResults.filter((item) => item.res.status === 'failed' || !item.res.result_url).length;
          if (failedCount > 0) {
            toast.error(`${failedCount}/${batchNodes.length} ảnh tham chiếu thất bại`);
          } else {
            toast.success(`✅ ${batchNodes.length} ảnh tham chiếu xong`);
          }
        } else if (execNode.type === 'generate') {
          // Generate image
          const finalPrompt = nodePrompt || 'Professional marketing image';

          // Collect ref images: từ aiprompt node refs + image/input/references nodes
          let allRefImages = [...refImages];
          for (const inp of allInputNodes) {
            if (!inp) continue;
            if (inp.type === 'aiprompt' && nodeResults[inp.id + '_refs']) {
              try {
                const aipromptRefs = JSON.parse(nodeResults[inp.id + '_refs']);
                appendUnique(allRefImages, aipromptRefs);
                appendUnique(styleReferenceImages, aipromptRefs);
              } catch {}
            }
          }

          const generateVariationIndex = generateNodes.findIndex((node) => node.id === execNode.id) + 1;
          const variationPreset = GENERATE_VARIATION_PRESETS[(generateVariationIndex - 1) % GENERATE_VARIATION_PRESETS.length];

          // Build enhanced prompt với vai trò ảnh rõ ràng
          let enhancedPrompt = finalPrompt;
          if (inputImages.length > 0) {
            enhancedPrompt += `\n\n[Input images: Use the provided input image(s) as the REQUIRED main subject(s). Preserve the person/product/object identity, face, product shape, packaging, label details, silhouette, materials, and key visual details as much as possible. If the style reference contains an old product/mockup/device/dental object/before-after image/product packshot, replace that old product slot with the matching input image while keeping the slot position, scale, perspective, lighting, and surrounding layout. If a person's clothing, pose, framing, or mood is revealing, suggestive, intimate, or not suitable for a healthcare advertisement, convert it to modest professional advertising styling with covered clothing and a neutral commercial pose. Do not replace the input subject with a person/product from the style reference.]`;
          }
          if (styleReferenceImages.length > 0) {
            enhancedPrompt += `\n\n[Style reference images: Use these only to analyze poster layout, typography hierarchy, color mood, spacing, dental/marketing visual structure, and decorative style. Do not copy the person/product from the style reference when input images are provided.]`;
            enhancedPrompt += `\n\n[Product replacement: Detect any main product, packshot, dental tray, teeth image, device, mockup, before/after panel, or object slot in the style reference. When input images are provided, replace those old reference products/objects with the matching input product/object. Preserve layout slot geometry, crop, shadows, reflections, perspective, and nearby badges, but remove the old product.]`;
            enhancedPrompt += `\n\n[Text replacement: Read all text positions from the style reference, but replace every old text string with new content from the user's prompt and current brand. Do not keep old headlines, offers, prices, CTAs, address, phone, footer text, or brand text from the reference image.]`;
          }
          if (currentBrand) {
            enhancedPrompt += `\n\n[Mandatory brand palette]\n${buildBrandPaletteInstruction(currentBrand)}\nRecolor every non-photo design element from style/reference images to this brand palette: background, gradients, CTA blocks, badges, icons, borders, decorative shapes, headline/subheadline/body text colors, large display typography/product or service name colors, footer bars, and small accents. If the reference has gold/yellow display text such as a product name, convert that typography color to brand primary or secondary. Do not keep old reference colors unless they match the current brand palette. Neutral white/black/gray and natural person/product photo colors may remain only when needed.`;
          }
          if (currentBrand?.logo_url) {
            enhancedPrompt += `\n\n[Brand logo: The brand logo image is provided. Place it prominently in the design, replacing any existing logos.]`;
          }
          enhancedPrompt += `\n\n[Professional safety: Always output a polished, non-sexual, family-safe professional advertisement. Use modest clothing, clean healthcare/commercial lighting, and brand-safe dental marketing aesthetics. Do not preserve provocative wardrobe, seductive pose, body-emphasis, bedroom/mirror-selfie intimacy, erotic mood, or suggestive framing from any input image.]`;
          enhancedPrompt += `\n\n[Ngôn ngữ bắt buộc: Mọi chữ hiển thị trong ảnh cuối phải là tiếng Việt có dấu, tự nhiên, đúng chính tả. Không dùng tiếng Anh trong headline, CTA, badge, footer, ưu đãi, địa chỉ, caption hoặc bất kỳ text overlay nào. Nếu prompt hoặc ảnh tham khảo có chữ tiếng Anh, hãy chuyển nghĩa sang tiếng Việt trước khi đưa vào ảnh.]`;
          enhancedPrompt += `\n\n[Variation ${generateVariationIndex}: ${variationPreset} This output must be visibly different from other generator nodes. Do not reuse the exact same layout, crop, typography placement, subject position, or badge arrangement.]`;

          console.log(`[Flow] Generate with prompt (${enhancedPrompt.length} chars)`);
          console.log(`[Flow] Input images: ${inputImages.length}, Style references: ${styleReferenceImages.length}, Total refs: ${allRefImages.length}`);

          const res = await generateImage({
            project_id: currentProject.id,
            ...(currentBrand?.id ? { brand_id: currentBrand.id } : {}),
            user_input: enhancedPrompt,
            reference_images: allRefImages.length > 0 ? allRefImages : undefined,
            input_images: inputImages.length > 0 ? inputImages : undefined,
            style_reference_images: styleReferenceImages.length > 0 ? styleReferenceImages : undefined,
            variation_index: generateVariationIndex,
          });
          const responses = [res];
          allResults.push(res);

          if (res.status === 'failed') {
            setNodes((nds) => nds.map((n) => n.id === execNode.id ? { ...n, data: { ...n.data, status: 'error', generating: false, results: responses, lastPrompt: finalPrompt } } : n));
            toast.error(res.error_message || 'Lỗi tạo ảnh');
            continue;
          }

          if (res.result_url) {
            nodeResults[execNode.id] = res.result_url;
          }

          setNodes((nds) => nds.map((n) => n.id === execNode.id ? { ...n, data: { ...n.data, status: 'done', generating: false, results: responses, lastPrompt: finalPrompt } } : n));
          toast.success(`✅ Generate xong`);
        } else if (execNode.type === 'video') {
          // Generate video - collect TẤT CẢ ảnh từ các node nối vào
          const videoImageUrls: string[] = [...refImages];

          // Lấy thêm output từ các generate nodes đã chạy
          for (const inp of allInputNodes) {
            if (!inp) continue;
            if (inp.type === 'generate' && nodeResults[inp.id]) {
              appendUnique(videoImageUrls, [nodeResults[inp.id]]);
            } else if (inp.type === 'storyboardImage') {
              appendUnique(videoImageUrls, [getStoryboardImageUrl(inp, runtimeStoryboardImages, currentStoryboardImages)]);
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
                  appendUnique(videoImageUrls, [url]);
                }
              }
            }
          }

          const omniImageUrls = videoImageUrls.slice(0, 3);
          console.log(`[Flow] Video with ${omniImageUrls.length} images, prompt: ${nodePrompt.slice(0, 50)}`);

          setGeneratingVideo(true);
          toast('Đang tạo video Google Omni...', { icon: '🎬' });
          const nodeVideoOptions = currentVideoOptions[execNode.id] || {
            aspectRatio: '16:9' as const,
            durationSeconds: 10,
            voiceStyle: 'Vietnamese female voice, warm Northern accent',
            videoStyle: 'tvc' as const,
          };
          const videoRes = await generateVideo({
            project_id: currentProject.id,
            prompt: nodePrompt || 'Create a smooth animated video from these images',
            input_image_urls: omniImageUrls.length > 0 ? omniImageUrls : undefined,
            aspect_ratio: nodeVideoOptions.aspectRatio,
            duration_seconds: nodeVideoOptions.durationSeconds,
            voice_style: nodeVideoOptions.voiceStyle,
            video_style: nodeVideoOptions.videoStyle,
          });

          const completedVideo = await waitForVideoGeneration(videoRes.id);
          setVideoResult(completedVideo);
          setGeneratingVideo(false);

          if (completedVideo.status === 'failed') {
            setNodes((nds) => nds.map((n) => n.id === execNode.id ? { ...n, data: { ...n.data, status: 'error', generating: false, result: completedVideo } } : n));
            toast.error(completedVideo.error_message || 'Tạo video thất bại');
            continue;
          }

          setNodes((nds) => nds.map((n) => n.id === execNode.id ? { ...n, data: { ...n.data, status: 'done', generating: false, result: completedVideo } } : n));
          toast.success(`✅ Video Google Omni xong`);
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
      setGeneratingVideo(false);
      setGenerating(false);
    }
  }, [numImages, nodes, edges]);

  // ═══════════════════════════════════════════════
  // EDIT / REGENERATE - Sửa hình không đúng ý
  // ═══════════════════════════════════════════════
  const handleRegenerate = useCallback(async (index: number, newPrompt?: string) => {
    const currentProject = selectedProjectRef.current;
    const currentBrand = selectedBrandRef.current;
    const currentFiles = referenceFilesRef.current;
    const currentImageFiles = imageNodeFilesRef.current;
    const currentPrompt = promptRef.current;
    const currentScannedPrompt = scannedPromptRef.current;
    const currentComposedPrompt = composePrompt(currentScannedPrompt, currentPrompt);

    if (!currentProject) {
      toast.error('Chọn dự án trước khi tạo lại hình');
      return;
    }
    if (!currentBrand) {
      toast.error('Chọn brand trước khi tạo lại hình');
      return;
    }
    if (currentProject.brand_id !== currentBrand.id) {
      toast.error('Dự án đang chọn không thuộc brand hiện tại');
      return;
    }

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
        project_id: currentProject.id,
        brand_id: currentBrand.id,
        user_input: newPrompt || editPrompt || currentComposedPrompt,
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
  const handleGenerateVideo = useCallback(async (override?: {
    prompt?: string;
    aspectRatio?: '16:9' | '9:16';
    durationSeconds?: number;
    voiceStyle?: string;
    videoStyle?: 'tvc' | 'intro';
  }, videoNodeId?: string) => {
    const currentProject = selectedProjectRef.current;
    const currentBrand = selectedBrandRef.current;
    if (!currentBrand) {
      toast.error('Chọn brand trước khi tạo video');
      return;
    }
    if (!currentProject) {
      toast.error('Tạo hoặc chọn dự án trước khi tạo video');
      return;
    }
    if (currentProject.brand_id !== currentBrand.id) {
      toast.error('Dự án đang chọn không thuộc brand hiện tại');
      return;
    }

    let nextPrompt = override?.prompt?.trim() || videoPrompt.trim();
    const videoImageUrls: string[] = [];

    if (videoNodeId) {
      const upstreamNodes = getUpstreamNodes(videoNodeId, edges, nodes);
      const identityImageUrls: string[] = [];
      const storyboardImageUrls = upstreamNodes
        .filter((upstreamNode) => upstreamNode.type === 'storyboardImage')
        .map((upstreamNode) => getStoryboardImageUrl(upstreamNode, {}, storyboardImages))
        .filter(Boolean);

      for (const upstreamNode of upstreamNodes) {
        if (upstreamNode.type === 'storyboardImage') {
          continue;
        } else if (upstreamNode.type === 'storyboard') {
          const storyboard = storyboards[upstreamNode.id]?.trim() || (upstreamNode.data as any)?.storyboard?.trim() || '';
          if (!nextPrompt && storyboard) nextPrompt = storyboard;
          if (storyboardImageUrls.length === 0) {
            appendUnique(videoImageUrls, storyboardImages[upstreamNode.id] || (upstreamNode.data as any)?.imageUrls || []);
          }
        } else if (upstreamNode.type === 'prompt') {
          const promptText = (upstreamNode.data as any)?.prompt?.trim();
          if (!nextPrompt && promptText) nextPrompt = promptText;
        } else if (upstreamNode.type === 'image') {
          appendUnique(identityImageUrls, imageNodeLibraryUrls[upstreamNode.id] || []);
          for (const file of imageNodeFiles[upstreamNode.id] || []) {
            const { url } = await uploadFile(file);
            appendUnique(identityImageUrls, [url]);
          }
        } else if (upstreamNode.type === 'input') {
          appendUnique(identityImageUrls, inputNodeLibraryUrls[upstreamNode.id] || []);
          for (const file of inputNodeFiles[upstreamNode.id] || []) {
            const { url } = await uploadFile(file);
            appendUnique(identityImageUrls, [url]);
          }
        } else if (upstreamNode.type === 'references') {
          if (storyboardImageUrls.length > 0) continue;
          appendUnique(videoImageUrls, referenceLibraryUrls);
          for (const file of referenceFiles) {
            const { url } = await uploadFile(file);
            appendUnique(videoImageUrls, [url]);
          }
        } else if (upstreamNode.type === 'generate') {
          if (storyboardImageUrls.length > 0) continue;
          const nodeResults = ((upstreamNode.data as any)?.results || []) as ImageGeneration[];
          appendUnique(videoImageUrls, nodeResults.map((result) => result.result_url || '').filter(Boolean));
        }
      }

      appendUnique(videoImageUrls, identityImageUrls);
      appendUnique(videoImageUrls, storyboardImageUrls);
    }

    const fallbackImageUrl = results.find(r => r.status === 'completed')?.result_url;
    appendUnique(videoImageUrls, fallbackImageUrl ? [fallbackImageUrl] : []);
    const omniImageUrls = videoImageUrls.slice(0, 4);

    if (!nextPrompt.trim() && omniImageUrls.length === 0) {
      toast.error('Cần prompt hoặc hình ảnh input');
      return;
    }
    setGeneratingVideo(true);
    setVideoResult(null);
    if (videoNodeId) {
      setNodes((nds) => nds.map((node) => node.id === videoNodeId
        ? { ...node, data: { ...node.data, status: 'running', generating: true, result: undefined } }
        : node
      ));
    }
    try {
      const res = await generateVideo({
        project_id: currentProject.id,
        prompt: nextPrompt || prompt,
        input_image_urls: omniImageUrls.length > 0 ? omniImageUrls : undefined,
        aspect_ratio: override?.aspectRatio || '16:9',
        duration_seconds: override?.durationSeconds || 10,
        voice_style: override?.voiceStyle || 'Vietnamese female voice, warm Northern accent',
        video_style: override?.videoStyle || 'tvc',
      });
      const completedVideo = await waitForVideoGeneration(res.id);
      setVideoResult(completedVideo);
      if (videoNodeId) {
        setNodes((nds) => nds.map((node) => node.id === videoNodeId
          ? { ...node, data: { ...node.data, status: completedVideo.status === 'failed' ? 'error' : 'done', generating: false, result: completedVideo } }
          : node
        ));
      }
      if (completedVideo.status === 'failed') {
        toast.error(completedVideo.error_message || 'Tạo video thất bại');
      } else {
        toast.success('Đã tạo video Google Omni!');
      }
    } catch (err) {
      if (videoNodeId) {
        setNodes((nds) => nds.map((node) => node.id === videoNodeId
          ? { ...node, data: { ...node.data, status: 'error', generating: false } }
          : node
        ));
      }
      toast.error('Tạo video thất bại');
    } finally {
      setGeneratingVideo(false);
    }
  }, [
    videoPrompt,
    prompt,
    results,
    edges,
    nodes,
    storyboardImages,
    storyboards,
    imageNodeFiles,
    imageNodeLibraryUrls,
    inputNodeFiles,
    inputNodeLibraryUrls,
    referenceFiles,
    referenceLibraryUrls,
    setNodes,
  ]);

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
    setNodes((nds) => nds.concat({ id: getNextId(type), type, position, data: {}, style: getDefaultNodeStyle(type) }));
  }, [screenToFlowPosition, setNodes]);

  const handleAnalyzeReferencePrompt = useCallback(async (urls: string[]) => {
    const uniqueUrls = urls.filter((url, index, arr) => Boolean(url) && arr.indexOf(url) === index);
    if (uniqueUrls.length === 0 || analyzingReferencePrompt) return;

    setAnalyzingReferencePrompt(true);
    toast('Đang quét text, bố cục và màu sắc từ ảnh tham khảo...', { icon: '🔎' });
    try {
      const analysis = await analyzeReferenceStructure({
        reference_image_urls: uniqueUrls,
        mode: 'replace_subject',
      });
      setReferenceAnalysis(analysis);
      setScannedPrompt(buildPromptFromReferenceAnalysis(analysis, selectedBrand));
      toast.success('Đã tách bố cục, màu sắc và text từ ảnh tham khảo');
    } catch (err) {
      console.error('Analyze reference prompt error:', err);
      toast.error('Lỗi quét prompt từ ảnh tham khảo');
    } finally {
      setAnalyzingReferencePrompt(false);
    }
  }, [analyzingReferencePrompt, selectedBrand]);

  const handleReferenceAnalysisChange = useCallback((analysis: ReferenceStructureAnalysis) => {
    setReferenceAnalysis(analysis);
    setScannedPrompt(buildPromptFromReferenceAnalysis(analysis, selectedBrand));
  }, [selectedBrand]);

  const handleAnalyzeBrand = useCallback(async () => {
    if (!selectedBrand?.logo_url || analyzingBrand) {
      toast.error('Brand cần có logo để quét');
      return;
    }
    setAnalyzingBrand(true);
    toast('Đang quét logo brand...', { icon: '🎨' });
    try {
      const analysis = await analyzeBrandAsset({ logo_url: selectedBrand.logo_url });
      const fontDetail = [
        analysis.fontAnalysis?.category,
        analysis.fontAnalysis?.weight,
        analysis.fontAnalysis?.letterShape,
        analysis.fontAnalysis?.caseStyle,
        analysis.fontAnalysis?.spacing,
      ].filter(Boolean).join(', ');
      const cleanedDescription = removeGeneratedBrandAnalysis(selectedBrand.description);
      const nextBrand = {
        ...selectedBrand,
        name: analysis.brandName || selectedBrand.name,
        primary_color: analysis.colors?.primary || selectedBrand.primary_color,
        secondary_color: analysis.colors?.secondary || selectedBrand.secondary_color,
        description: [
          cleanedDescription,
          `Font: ${analysis.fontStyle}`,
          fontDetail ? `Font detail: ${fontDetail}` : '',
          analysis.fontAnalysis?.fontPrompt ? `Font prompt: ${analysis.fontAnalysis.fontPrompt}` : '',
          `Style: ${analysis.visualStyle}`,
        ].filter(Boolean).join('\n'),
      };
      const saved = await updateBrand(selectedBrand.id, {
        name: nextBrand.name,
        primary_color: nextBrand.primary_color,
        secondary_color: nextBrand.secondary_color,
        description: nextBrand.description,
      });
      setSelectedBrand(saved);
      setBrands(prev => prev.map((brand) => brand.id === saved.id ? saved : brand));
      toast.success('Đã quét và cập nhật brand từ logo');
    } catch (err) {
      console.error('Analyze brand error:', err);
      toast.error('Lỗi quét logo brand');
    } finally {
      setAnalyzingBrand(false);
    }
  }, [analyzingBrand, selectedBrand]);

  const collectImageUrlsForNode = useCallback(async (targetNodeId: string): Promise<string[]> => {
    const upstreamNodes = getUpstreamNodes(targetNodeId, edges, nodes);
    const imageUrls: string[] = [];

    for (const upstreamNode of upstreamNodes) {
      if (upstreamNode.type === 'image') {
        appendUnique(imageUrls, imageNodeLibraryUrls[upstreamNode.id] || []);
        for (const file of imageNodeFiles[upstreamNode.id] || []) {
          const { url } = await uploadFile(file);
          appendUnique(imageUrls, [url]);
        }
      } else if (upstreamNode.type === 'input') {
        appendUnique(imageUrls, inputNodeLibraryUrls[upstreamNode.id] || []);
        for (const file of inputNodeFiles[upstreamNode.id] || []) {
          const { url } = await uploadFile(file);
          appendUnique(imageUrls, [url]);
        }
      } else if (upstreamNode.type === 'references') {
        appendUnique(imageUrls, referenceLibraryUrls);
        for (const file of referenceFiles) {
          const { url } = await uploadFile(file);
          appendUnique(imageUrls, [url]);
        }
      }
    }

    return imageUrls.slice(0, 3);
  }, [
    edges,
    nodes,
    imageNodeFiles,
    imageNodeLibraryUrls,
    inputNodeFiles,
    inputNodeLibraryUrls,
    referenceFiles,
    referenceLibraryUrls,
  ]);

  const regenerateStoryboardNode = useCallback(async (storyboardNodeId: string, scriptOverride?: string) => {
    const upstreamNodes = getUpstreamNodes(storyboardNodeId, edges, nodes);
    const upstreamPromptNode = upstreamNodes.find((node) => node.type === 'prompt');
    const promptExtra = (upstreamPromptNode?.data as any)?.prompt?.trim() || '';
    const script =
      scriptOverride?.trim() ||
      composePrompt(scannedPrompt, promptExtra || prompt);

    if (!script) {
      toast.error('Nối Prompt hoặc nhập ý tưởng trước');
      return;
    }

    setNodes((nds) => nds.map((node) => node.id === storyboardNodeId
      ? { ...node, data: { ...node.data, status: 'running', generating: true } }
      : node
    ));

    try {
      const imageUrls = await collectImageUrlsForNode(storyboardNodeId);
      const { storyboard } = await generateVideoStoryboard({
        script,
        image_urls: imageUrls.length > 0 ? imageUrls : undefined,
      });

      setStoryboards((prev) => ({ ...prev, [storyboardNodeId]: storyboard }));
      setStoryboardImages((prev) => ({ ...prev, [storyboardNodeId]: imageUrls }));
      setNodes((nds) => nds.map((node) => node.id === storyboardNodeId
        ? { ...node, data: { ...node.data, storyboard, imageUrls, status: 'done', generating: false } }
        : node
      ));
      toast.success('Đã tạo lại Storybook');
    } catch (error) {
      console.error('Regenerate storyboard error:', error);
      setNodes((nds) => nds.map((node) => node.id === storyboardNodeId
        ? { ...node, data: { ...node.data, status: 'error', generating: false } }
        : node
      ));
      toast.error('Tạo lại Storybook thất bại');
    }
  }, [edges, nodes, prompt, scannedPrompt, setNodes, collectImageUrlsForNode]);

  const regenerateStoryboardImageNode = useCallback(async (storyboardImageNodeId: string) => {
    if (!selectedBrand) {
      toast.error('Chọn brand trước khi tạo lại ảnh tham chiếu');
      return;
    }
    if (!selectedProject) {
      toast.error('Chọn dự án trước khi tạo lại ảnh tham chiếu');
      return;
    }
    if (selectedProject.brand_id !== selectedBrand.id) {
      toast.error('Dự án đang chọn không thuộc brand hiện tại');
      return;
    }

    const storyboardImageNode = nodes.find((node) => node.id === storyboardImageNodeId);
    if (!storyboardImageNode) return;

    const nodeData = storyboardImageNode.data as any;
    const frameIndex = typeof nodeData?.index === 'number' ? nodeData.index : 0;
    const storyboardImageCount = Math.max(nodes.filter((node) => node.type === 'storyboardImage').length, 1);
    const promptText = nodeData?.prompt?.trim() || buildStoryboardReferenceImagePrompt(prompt, frameIndex, storyboardImageCount);
    if (!promptText.trim()) {
      toast.error('Nhập prompt cho ảnh tham chiếu trước');
      return;
    }

    setNodes((nds) => nds.map((node) => node.id === storyboardImageNodeId
      ? { ...node, data: { ...node.data, status: 'running', generating: true } }
      : node
    ));

    try {
      const imageUrls = await collectImageUrlsForNode(storyboardImageNodeId);
      const res = await generateImage({
        project_id: selectedProject.id,
        ...(selectedBrand?.id ? { brand_id: selectedBrand.id } : {}),
        user_input: promptText,
        reference_images: imageUrls.length > 0 ? imageUrls.slice(0, 3) : undefined,
        input_images: imageUrls.length > 0 ? imageUrls.slice(0, 3) : undefined,
        variation_index: frameIndex + 1,
      });

      if (res.status === 'failed' || !res.result_url) {
        throw new Error(res.error_message || 'Tạo ảnh tham chiếu thất bại');
      }

      setNodes((nds) => nds.map((node) => node.id === storyboardImageNodeId
        ? { ...node, data: { ...node.data, imageUrl: res.result_url, prompt: promptText, status: 'done', generating: false, result: res } }
        : node
      ));
      toast.success(`Đã tạo lại ảnh tham chiếu ${frameIndex + 1}`);
    } catch (error) {
      console.error('Regenerate storyboard image error:', error);
      setNodes((nds) => nds.map((node) => node.id === storyboardImageNodeId
        ? { ...node, data: { ...node.data, status: 'error', generating: false } }
        : node
      ));
      toast.error('Tạo lại ảnh tham chiếu thất bại');
    }
  }, [nodes, prompt, selectedBrand, selectedProject, setNodes, collectImageUrlsForNode]);

  const handleCreateStoryboardFromPrompt = useCallback(async (promptNodeId: string, script: string) => {
    const cleanScript = script.trim();
    if (!cleanScript) {
      toast.error('Nhập ý tưởng video trước');
      return;
    }

    const targetStoryboardNodes = edges
      .filter((edge) => edge.source === promptNodeId)
      .map((edge) => nodes.find((node) => node.id === edge.target))
      .filter((node): node is Node => Boolean(node) && node?.type === 'storyboard');

    if (targetStoryboardNodes.length === 0) {
      toast.error('Nối Prompt vào node Storybook trước');
      return;
    }

    setCreatingStoryboardFromPrompt((prev) => ({ ...prev, [promptNodeId]: true }));
    toast('Đang tạo kịch bản Storybook...', { icon: '🎬' });

    try {
      for (const storyboardNode of targetStoryboardNodes) {
        await regenerateStoryboardNode(storyboardNode.id, cleanScript);
      }

      toast.success('Đã tạo kịch bản và đưa vào Storybook');
    } catch (error) {
      console.error('Create storyboard from prompt error:', error);
      targetStoryboardNodes.forEach((storyboardNode) => {
        setNodes((nds) => nds.map((node) => node.id === storyboardNode.id
          ? { ...node, data: { ...node.data, status: 'error', generating: false } }
          : node
        ));
      });
      toast.error('Tạo kịch bản thất bại');
    } finally {
      setCreatingStoryboardFromPrompt((prev) => ({ ...prev, [promptNodeId]: false }));
    }
  }, [edges, nodes, regenerateStoryboardNode]);

  useEffect(() => {
    if (!referenceAnalysis) return;
    setScannedPrompt(buildPromptFromReferenceAnalysis(referenceAnalysis, selectedBrand));
  }, [
    referenceAnalysis,
    selectedBrand?.id,
    selectedBrand?.name,
    selectedBrand?.primary_color,
    selectedBrand?.secondary_color,
    selectedBrand?.logo_url,
    selectedBrand?.description,
  ]);

  // Stable ref for callbacks
  const handleRunFlowRef = useRef(handleRunFlow);
  handleRunFlowRef.current = handleRunFlow;
  const handleRegenerateRef = useRef(handleRegenerate);
  handleRegenerateRef.current = handleRegenerate;
  const handleGenerateVideoRef = useRef(handleGenerateVideo);
  handleGenerateVideoRef.current = handleGenerateVideo;
  const handleCreateStoryboardFromPromptRef = useRef(handleCreateStoryboardFromPrompt);
  handleCreateStoryboardFromPromptRef.current = handleCreateStoryboardFromPrompt;
  const regenerateStoryboardNodeRef = useRef(regenerateStoryboardNode);
  regenerateStoryboardNodeRef.current = regenerateStoryboardNode;
  const regenerateStoryboardImageNodeRef = useRef(regenerateStoryboardImageNode);
  regenerateStoryboardImageNodeRef.current = regenerateStoryboardImageNode;
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
            onAnalyzeBrand: handleAnalyzeBrand,
            analyzingBrand,
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
          return { ...node, data: { 
            files: referenceFiles, 
            libraryUrls: referenceLibraryUrls,
            onFilesAdd: (f: File[]) => setReferenceFiles(prev => [...prev, ...f]), 
            onFileRemove: (i: number) => setReferenceFiles(prev => prev.filter((_, idx) => idx !== i)), 
            onLibraryUrlsChange: (urls: string[]) => setReferenceLibraryUrls(urls),
            onAnalyze: handleAnalyzeReferencePrompt,
            analyzing: analyzingReferencePrompt,
            analysis: referenceAnalysis,
            onAnalysisChange: handleReferenceAnalysisChange,
            onDelete: deleteHandler 
          } };
        }
        if (node.type === 'image') {
          return { ...node, data: { 
            files: imageNodeFiles[node.id] || [], 
            libraryUrls: imageNodeLibraryUrls[node.id] || [],
            label: (node.data as any)?.label,
            onFilesAdd: (f: File[]) => setImageNodeFiles(prev => ({ ...prev, [node.id]: [...(prev[node.id] || []), ...f] })), 
            onFileRemove: (i: number) => setImageNodeFiles(prev => ({ ...prev, [node.id]: (prev[node.id] || []).filter((_, idx) => idx !== i) })),
            onLibraryUrlsChange: (urls: string[]) => setImageNodeLibraryUrls(prev => ({ ...prev, [node.id]: urls })),
            onDelete: deleteHandler 
          } };
        }
        if (node.type === 'input') {
          return { ...node, data: {
            files: inputNodeFiles[node.id] || [],
            libraryUrls: inputNodeLibraryUrls[node.id] || [],
            label: (node.data as any)?.label,
            onFilesAdd: (f: File[]) => setInputNodeFiles(prev => ({ ...prev, [node.id]: [...(prev[node.id] || []), ...f] })),
            onFileRemove: (i: number) => setInputNodeFiles(prev => ({ ...prev, [node.id]: (prev[node.id] || []).filter((_, idx) => idx !== i) })),
            onLibraryUrlsChange: (urls: string[]) => setInputNodeLibraryUrls(prev => ({ ...prev, [node.id]: urls })),
            onDelete: deleteHandler,
          } };
        }
        if (node.type === 'layout') {
          const config = layoutConfigs[node.id] || (node.data as any)?.config;
          return { ...node, data: {
            config,
            onChange: (nextConfig: any) => setLayoutConfigs(prev => ({ ...prev, [node.id]: nextConfig })),
            onDelete: deleteHandler,
          } };
        }
        if (node.type === 'prompt') {
          const hasStoryboardTarget = edges.some((edge) => {
            const targetNode = nds.find((candidate) => candidate.id === edge.target);
            return edge.source === node.id && targetNode?.type === 'storyboard';
          });
          return { ...node, data: {
            prompt,
            scannedPromptAvailable: scannedPrompt.trim().length > 0,
            creatingStoryboard: Boolean(creatingStoryboardFromPrompt[node.id]),
            onChange: setPrompt,
            onCreateStoryboard: hasStoryboardTarget
              ? (value: string) => handleCreateStoryboardFromPromptRef.current(node.id, value)
              : undefined,
            onDelete: deleteHandler
          } };
        }
        if (node.type === 'storyboard') {
          const storyboard = storyboards[node.id] || (node.data as any)?.storyboard || '';
          return { ...node, data: {
            storyboard,
            imageUrls: storyboardImages[node.id] || (node.data as any)?.imageUrls || [],
            generating: Boolean((node.data as any)?.generating),
            status: (node.data as any)?.status || 'idle',
            onChange: (val: string) => setStoryboards(prev => ({ ...prev, [node.id]: val })),
            onRegenerate: () => regenerateStoryboardNodeRef.current(node.id),
            onDelete: deleteHandler,
          } };
        }
        if (node.type === 'storyboardImage') {
          const nodeData = node.data as any;
          const sourceStoryboardId = nodeData?.sourceStoryboardId;
          const index = typeof nodeData?.index === 'number' ? nodeData.index : 0;
          const sourceNode = sourceStoryboardId ? nds.find((candidate) => candidate.id === sourceStoryboardId) : undefined;
          const sourceGenerating = Boolean((sourceNode?.data as any)?.generating);
          const storyboardImageCount = nds.filter((candidate) => candidate.type === 'storyboardImage').length;
          return { ...node, data: {
            ...node.data,
            index,
            imageUrl: sourceStoryboardId ? storyboardImages[sourceStoryboardId]?.[index] || nodeData?.imageUrl || '' : nodeData?.imageUrl || '',
            prompt: nodeData?.prompt || '',
            sheetMode: Boolean(nodeData?.sheetMode) || storyboardImageCount === 1,
            generating: sourceGenerating || Boolean(nodeData?.generating),
            onPromptChange: (value: string) => setNodes((nds) => nds.map((candidate) => candidate.id === node.id
              ? { ...candidate, data: { ...candidate.data, prompt: value } }
              : candidate
            )),
            onRegenerate: sourceStoryboardId ? () => regenerateStoryboardNodeRef.current(sourceStoryboardId) : () => regenerateStoryboardImageNodeRef.current(node.id),
            onDelete: deleteHandler,
          } };
        }
        if (node.type === 'generate') {
          return { ...node, data: {
            ...node.data,
            generating: Boolean((node.data as any)?.generating),
            results: (node.data as any)?.results || [],
            onGenerate: (n: number) => handleRunFlowRef.current(n),
            onRegenerate: (_i: number, _p?: string) => handleRunFlowRef.current(1),
            canGenerate: !!selectedBrand && (prompt.trim().length > 0 || scannedPrompt.trim().length > 0),
            onDelete: deleteHandler
          } };
        }
        if (node.type === 'video') {
          const options = videoOptions[node.id] || {
            aspectRatio: '16:9',
            durationSeconds: 10,
            voiceStyle: 'Vietnamese female voice, warm Northern accent',
            videoStyle: 'tvc',
          };
          return { ...node, data: {
            prompt: videoPrompt,
            ...options,
            imageUrl: results.find(r => r.status === 'completed')?.result_url,
            generating: Boolean((node.data as any)?.generating) || generatingVideo,
            result: (node.data as any)?.result || videoResult,
            onGenerate: (next: {
              prompt: string;
              aspectRatio: '16:9' | '9:16';
              durationSeconds: number;
              voiceStyle: string;
              videoStyle: 'tvc' | 'intro';
            }) => {
              setVideoPrompt(next.prompt);
              setVideoOptions(prev => ({
                ...prev,
                [node.id]: {
                  aspectRatio: next.aspectRatio,
                  durationSeconds: next.durationSeconds,
                  voiceStyle: next.voiceStyle,
                  videoStyle: next.videoStyle,
                },
              }));
              handleGenerateVideoRef.current(next, node.id);
            },
            onOptionsChange: (nextOptions: {
              aspectRatio: '16:9' | '9:16';
              durationSeconds: number;
              voiceStyle: string;
              videoStyle: 'tvc' | 'intro';
            }) => setVideoOptions(prev => ({ ...prev, [node.id]: nextOptions })),
            canGenerate: true,
            onDelete: deleteHandler
          } };
        }
        if (node.type === 'text') {
          const noteText = textNotes[node.id] || '';
          return { ...node, data: { text: noteText, onChange: (val: string) => setTextNotes(prev => ({ ...prev, [node.id]: val })), onDelete: deleteHandler } };
        }
        return node;
      })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brands, templates, selectedBrand, selectedTemplate, selectedProject, referenceFiles, referenceLibraryUrls, referenceAnalysis, imageNodeFiles, imageNodeLibraryUrls, inputNodeFiles, inputNodeLibraryUrls, prompt, scannedPrompt, analyzingReferencePrompt, analyzingBrand, generating, results, numImages, videoPrompt, videoOptions, generatingVideo, videoResult, textNotes, layoutConfigs, storyboards, storyboardImages, creatingStoryboardFromPrompt, edges, handleAnalyzeReferencePrompt, handleReferenceAnalysisChange, handleAnalyzeBrand]);

  const nodeTypes = useMemo(() => ({
    brand: BrandNode,
    template: TemplateNode,
    references: ReferenceNode,
    image: ImageNode,
    input: InputImageNode,
    layout: LayoutNode,
    prompt: PromptNode,
    generate: GenerateNode,
    video: VideoNode,
    text: TextNode,
    aiprompt: AIPromptNode,
    storyboard: StoryboardNode,
    storyboardImage: StoryboardImageNode,
  }), []);

  return (
    <div className="h-screen w-screen relative flex">
      {/* Node Palette - Left */}
      <NodePalette
        onOpenWorkflowTemplates={() => setShowTemplates(true)}
        projects={visibleProjects}
        selectedProjectId={selectedProject?.id || ''}
        selectedBrandName={selectedBrand?.name}
        newProjectName={newProjectName}
        creatingProject={creatingProject}
        onSelectProject={handleSelectProject}
        onNewProjectNameChange={setNewProjectName}
        onCreateProject={handleCreateProject}
      />

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
            {selectedProject && (
              <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-2.5 py-1.5">
                <p className="max-w-[240px] truncate text-[12px] font-medium text-[var(--text-primary)]">
                  {selectedProject.name}
                </p>
              </div>
            )}
            <div className="flex items-center gap-1 ml-2">
              <button
                onClick={() => { if (confirm('Tạo workflow mặc định mới?')) resetToDefaultWorkflow(); }}
                className="px-2.5 py-1.5 text-[12px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded-lg transition"
              >
                New
              </button>
              <button
                onClick={handleSaveProjectWorkflow}
                disabled={!selectedProject}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded-lg transition disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Save className="h-3.5 w-3.5" />
                Save
              </button>
            </div>
          </div>

          {/* Right - Run */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleRunFlow()}
              disabled={generating || !selectedBrand || !selectedProject}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold transition-all ${
                !generating && selectedBrand && selectedProject
                  ? 'bg-[var(--accent)] text-white hover:opacity-90'
                  : generating
                    ? 'bg-[var(--accent-yellow)] text-black cursor-wait'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
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
          {selectedBrand && selectedProject ? (
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
                    video: '#e11d48', text: '#6b7280', storyboard: '#38bdf8',
                    storyboardImage: '#60a5fa',
                  };
                  return colors[node.type || ''] || '#64748b';
                }}
                maskColor="rgba(248,250,252,0.7)"
              />
            </ReactFlow>
          ) : (
            <div className="flex h-full items-center justify-center bg-[var(--bg-primary)]">
              <div className="w-[420px] rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-5">
                <div className="mb-4 flex items-center gap-2">
                  <FolderOpen className="h-5 w-5 text-[var(--accent)]" />
                  <h2 className="text-[16px] font-semibold text-[var(--text-primary)]">{selectedBrand ? 'Tạo dự án trước' : 'Chọn brand trước'}</h2>
                </div>
                <p className="mb-4 text-[13px] leading-relaxed text-[var(--text-secondary)]">
                  {selectedBrand
                    ? `Workflow của ${selectedBrand.name} chỉ dùng dự án thuộc brand này. Tạo hoặc chọn dự án để bắt đầu.`
                    : 'Mỗi dự án chỉ thuộc một brand. Chọn brand ở node Thương hiệu trước, rồi hệ thống sẽ tạo/chọn dự án riêng cho brand đó.'}
                </p>
                <div className="flex gap-2">
                  <input
                    value={newProjectName}
                    onChange={(event) => setNewProjectName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') handleCreateProject();
                    }}
                    placeholder="VD: Campaign niềng răng tháng 8"
                    className="flex-1 rounded-md border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-[13px] text-[var(--text-primary)] outline-none"
                  />
                  <button
                    onClick={handleCreateProject}
                    disabled={!selectedBrand || !newProjectName.trim() || creatingProject}
                    className="rounded-md bg-[var(--accent)] px-3 py-2 text-[13px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Tạo
                  </button>
                </div>
              </div>
            </div>
          )}
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
          setReferenceFiles([]);
          setReferenceLibraryUrls([]);
          setReferenceAnalysis(null);
          setImageNodeFiles({});
          setImageNodeLibraryUrls({});
          setInputNodeFiles({});
          setInputNodeLibraryUrls({});
          setPrompt('');
          setScannedPrompt('');
          setResults([]);
          setVideoPrompt('');
          setVideoResult(null);
          setVideoOptions({});
          setTextNotes({});
          setLayoutConfigs({});
          setStoryboards({});
          setStoryboardImages({});
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
