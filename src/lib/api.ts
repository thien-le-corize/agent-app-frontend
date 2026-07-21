import axios from 'axios';
import { Brand, Template, ImageGeneration, VideoGeneration, TrainingCategory, TrainingPhrase, TrainingScenario, TrainingFAQ, TrainingStats } from '@/types';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Brands
export async function getBrands(): Promise<Brand[]> {
  const { data } = await api.get('/brands');
  return data;
}

export async function getBrand(id: string): Promise<Brand> {
  const { data } = await api.get(`/brands/${id}`);
  return data;
}

export async function createBrand(brandData: {
  name: string;
  primary_color: string;
  secondary_color?: string;
  accent_color?: string;
  description?: string;
  logo_url?: string;
}): Promise<Brand> {
  const { data } = await api.post('/brands', brandData);
  return data;
}

export async function updateBrand(id: string, brandData: {
  name?: string;
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
  description?: string;
  logo_url?: string;
}): Promise<Brand> {
  const { data } = await api.put(`/brands/${id}`, brandData);
  return data;
}

export async function deleteBrand(id: string): Promise<void> {
  await api.delete(`/brands/${id}`);
}

// Templates
export async function getTemplates(category?: string): Promise<Template[]> {
  const params = category ? { category } : {};
  const { data } = await api.get('/templates', { params });
  return data;
}

export async function getTemplate(id: string): Promise<Template> {
  const { data } = await api.get(`/templates/${id}`);
  return data;
}

export async function createTemplate(templateData: Partial<Template>): Promise<Template> {
  const { data } = await api.post('/templates', templateData);
  return data;
}

// Image Generation
export async function generateImage(payload: {
  brand_id?: string;
  template_id?: string;
  user_input: string;
  reference_images?: string[];
  input_images?: string[];
  style_reference_images?: string[];
  variation_index?: number;
}): Promise<ImageGeneration> {
  const { data } = await api.post('/image-generations', payload);
  return data;
}

// AI Generate Prompt from brand + description
export async function generateAIPrompt(payload: {
  brand_name?: string;
  primary_color?: string;
  secondary_color?: string;
  font_style?: string;
  mood?: string;
  description: string;
  reference_description?: string;
  reference_image_urls?: string[];
}): Promise<{ prompt: string }> {
  const { data } = await api.post('/image-generations/generate-prompt', payload);
  return data;
}

export async function analyzeReferencePrompt(payload: {
  reference_image_urls: string[];
  mode?: 'replace_subject' | 'replace_text' | 'redesign';
}): Promise<{ prompt: string }> {
  const { data } = await api.post('/image-generations/analyze-reference-prompt', payload);
  return data;
}

export interface ReferenceStructureAnalysis {
  prompt: string;
  layout: Record<string, string>;
  colors: Record<string, string>;
  colorReplacements?: Array<{
    originalColor: string;
    originalUsage: string;
    replaceWith: string;
    brandRole: string;
    note: string;
  }>;
  productSlots?: Array<{
    role: string;
    description: string;
    position: string;
    size: string;
    shouldReplaceWithInput: boolean;
    replacementInstruction: string;
  }>;
  textItems: Array<{ role: string; originalText: string; suggestedText: string; position: string }>;
  style: Record<string, string>;
}

export async function analyzeReferenceStructure(payload: {
  reference_image_urls: string[];
  mode?: 'replace_subject' | 'replace_text' | 'redesign';
}): Promise<ReferenceStructureAnalysis> {
  const { data } = await api.post('/image-generations/analyze-reference-structure', payload);
  return data;
}

export async function analyzeBrandAsset(payload: {
  logo_url: string;
}): Promise<{
  brandName: string;
  colors: { primary: string; secondary: string; accent: string };
  fontStyle: string;
  fontAnalysis?: {
    category: string;
    weight: string;
    letterShape: string;
    caseStyle: string;
    spacing: string;
    comparableFonts: string[];
    fontPrompt: string;
  };
  visualStyle: string;
  confidence: string;
}> {
  const { data } = await api.post('/image-generations/analyze-brand-asset', payload);
  return data;
}

export async function getImageGenerations(params?: {
  brand_id?: string;
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<ImageGeneration[]> {
  const { data } = await api.get('/image-generations', { params });
  return data;
}

export async function getImageGeneration(id: string): Promise<ImageGeneration> {
  const { data } = await api.get(`/image-generations/${id}`);
  return data;
}

// File Upload
export async function uploadFile(file: File): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await api.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

// Video Generation (Gemini Omni Flash)
export async function generateVideo(payload: {
  prompt: string;
  input_image_url?: string;
  input_image_urls?: string[];
}): Promise<VideoGeneration> {
  const { data } = await api.post('/video-generations', payload);
  return data;
}

export async function getVideoGeneration(id: string): Promise<VideoGeneration> {
  const { data } = await api.get(`/video-generations/${id}`);
  return data;
}

// ==================== Chatbot Training ====================

// Chatbots CRUD
export async function getChatbots(): Promise<any[]> {
  const { data } = await api.get('/chatbot-training/chatbots');
  return data;
}

export async function getChatbot(id: string): Promise<any> {
  const { data } = await api.get(`/chatbot-training/chatbots/${id}`);
  return data;
}

export async function createChatbot(payload: { name: string; description?: string; prompt?: string; model?: string; settings?: object }): Promise<any> {
  const { data } = await api.post('/chatbot-training/chatbots', payload);
  return data;
}

export async function updateChatbot(id: string, payload: any): Promise<any> {
  const { data } = await api.put(`/chatbot-training/chatbots/${id}`, payload);
  return data;
}

export async function deleteChatbot(id: string): Promise<void> {
  await api.delete(`/chatbot-training/chatbots/${id}`);
}

// Stats
export async function getTrainingStats(): Promise<TrainingStats> {
  const { data } = await api.get('/chatbot-training/stats');
  return data;
}

// Categories
export async function getTrainingCategories(): Promise<TrainingCategory[]> {
  const { data } = await api.get('/chatbot-training/categories');
  return data;
}

export async function getTrainingCategory(id: string): Promise<TrainingCategory> {
  const { data } = await api.get(`/chatbot-training/categories/${id}`);
  return data;
}

export async function createTrainingCategory(payload: {
  name: string;
  description?: string;
  icon?: string;
  sort_order?: number;
}): Promise<TrainingCategory> {
  const { data } = await api.post('/chatbot-training/categories', payload);
  return data;
}

export async function updateTrainingCategory(id: string, payload: Partial<TrainingCategory>): Promise<TrainingCategory> {
  const { data } = await api.put(`/chatbot-training/categories/${id}`, payload);
  return data;
}

export async function deleteTrainingCategory(id: string): Promise<void> {
  await api.delete(`/chatbot-training/categories/${id}`);
}

// Phrases
export async function getTrainingPhrases(categoryId?: string): Promise<TrainingPhrase[]> {
  const params = categoryId ? { category_id: categoryId } : {};
  const { data } = await api.get('/chatbot-training/phrases', { params });
  return data;
}

export async function createTrainingPhrase(payload: {
  category_id: string;
  intent: string;
  user_message: string;
  bot_response: string;
  keywords?: string[];
  priority?: number;
}): Promise<TrainingPhrase> {
  const { data } = await api.post('/chatbot-training/phrases', payload);
  return data;
}

export async function updateTrainingPhrase(id: string, payload: Partial<TrainingPhrase>): Promise<TrainingPhrase> {
  const { data } = await api.put(`/chatbot-training/phrases/${id}`, payload);
  return data;
}

export async function deleteTrainingPhrase(id: string): Promise<void> {
  await api.delete(`/chatbot-training/phrases/${id}`);
}

// Scenarios
export async function getTrainingScenarios(categoryId?: string): Promise<TrainingScenario[]> {
  const params = categoryId ? { category_id: categoryId } : {};
  const { data } = await api.get('/chatbot-training/scenarios', { params });
  return data;
}

export async function createTrainingScenario(payload: {
  category_id: string;
  title: string;
  description?: string;
  trigger_condition: string;
  conversation_flow: object;
  severity?: string;
  resolution_guide?: string;
  tags?: string[];
}): Promise<TrainingScenario> {
  const { data } = await api.post('/chatbot-training/scenarios', payload);
  return data;
}

export async function updateTrainingScenario(id: string, payload: Partial<TrainingScenario>): Promise<TrainingScenario> {
  const { data } = await api.put(`/chatbot-training/scenarios/${id}`, payload);
  return data;
}

export async function deleteTrainingScenario(id: string): Promise<void> {
  await api.delete(`/chatbot-training/scenarios/${id}`);
}

// FAQs
export async function getTrainingFAQs(categoryId?: string): Promise<TrainingFAQ[]> {
  const params = categoryId ? { category_id: categoryId } : {};
  const { data } = await api.get('/chatbot-training/faqs', { params });
  return data;
}

export async function createTrainingFAQ(payload: {
  category_id: string;
  question: string;
  answer: string;
  related_questions?: string[];
  keywords?: string[];
  sort_order?: number;
}): Promise<TrainingFAQ> {
  const { data } = await api.post('/chatbot-training/faqs', payload);
  return data;
}

export async function updateTrainingFAQ(id: string, payload: Partial<TrainingFAQ>): Promise<TrainingFAQ> {
  const { data } = await api.put(`/chatbot-training/faqs/${id}`, payload);
  return data;
}

export async function deleteTrainingFAQ(id: string): Promise<void> {
  await api.delete(`/chatbot-training/faqs/${id}`);
}

// Chat with AI Bot
export async function chatWithBot(payload: {
  message: string;
  system_prompt?: string;
  history?: { role: 'user' | 'assistant'; content: string }[];
}): Promise<{ reply: string }> {
  const { data } = await api.post('/chatbot-training/chat', payload);
  return data;
}

// Get auto suggestions after bot reply
export async function getChatSuggestions(history: { role: 'user' | 'assistant'; content: string }[]): Promise<{ suggestions: string[] }> {
  const { data } = await api.post('/chatbot-training/chat/suggest', { history });
  return data;
}

// Seed training data from maucau.md
export async function seedTrainingData(): Promise<{ message: string; created: { categories: number; phrases: number; scenarios: number; faqs: number } }> {
  const { data } = await api.post('/chatbot-training/seed');
  return data;
}

// Upload knowledge file
export async function uploadKnowledgeFile(file: File, categoryId?: string): Promise<{ message: string; phrases_created: number }> {
  const formData = new FormData();
  formData.append('file', file);
  if (categoryId) formData.append('category_id', categoryId);
  const { data } = await api.post('/chatbot-training/knowledge/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

// Add knowledge text
export async function addKnowledgeText(content: string, title?: string, categoryId?: string): Promise<{ message: string; phrases_created: number }> {
  const { data } = await api.post('/chatbot-training/knowledge/text', { content, title, category_id: categoryId });
  return data;
}

// Reference Images Library
export async function getReferenceImages(): Promise<{ id: string; url: string; original_name: string | null; label: string | null; tags: string[] | null; created_at: string }[]> {
  const { data } = await api.get('/reference-images');
  return data;
}

export async function uploadReferenceImage(file: File, label?: string, tags?: string[]): Promise<{ id: string; url: string; label: string | null }> {
  const formData = new FormData();
  formData.append('file', file);
  if (label) formData.append('label', label);
  if (tags?.length) formData.append('tags', tags.join(','));
  const { data } = await api.post('/reference-images/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function deleteReferenceImage(id: string): Promise<void> {
  await api.delete(`/reference-images/${id}`);
}

export default api;
