export interface Brand {
  id: string;
  name: string;
  logo_url?: string;
  primary_color: string;
  secondary_color?: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface Template {
  id: string;
  name: string;
  description?: string;
  prompt_template: string;
  category: string;
  width: number;
  height: number;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  name: string;
  brand_id?: string | null;
  brand?: Brand | null;
  description?: string | null;
  workflow?: Record<string, any> | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ImageGeneration {
  id: string;
  project_id?: string;
  project?: Project;
  brand_id: string;
  brand?: Brand;
  template_id?: string;
  template?: Template;
  prompt: string;
  result_url?: string;
  reference_images?: string[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface DashboardStats {
  totalBrands: number;
  totalTemplates: number;
  totalGenerations: number;
}

export interface VideoGeneration {
  id: string;
  project_id?: string;
  project?: Project;
  prompt: string;
  input_image_url?: string;
  video_url?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error_message?: string;
  duration?: number;
  created_at: string;
  updated_at: string;
}

// ==================== Chatbot Training ====================

export interface TrainingCategory {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  status: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
  phrases?: TrainingPhrase[];
  scenarios?: TrainingScenario[];
  faqs?: TrainingFAQ[];
}

export interface TrainingPhrase {
  id: string;
  category_id: string;
  intent: string;
  user_message: string;
  bot_response: string;
  keywords?: string[];
  status: string;
  priority: number;
  created_at: string;
  updated_at: string;
  category?: TrainingCategory;
}

export interface TrainingScenario {
  id: string;
  category_id: string;
  title: string;
  description?: string;
  trigger_condition: string;
  conversation_flow: ConversationStep[];
  severity: string;
  resolution_guide?: string;
  tags?: string[];
  status: string;
  created_at: string;
  updated_at: string;
  category?: TrainingCategory;
}

export interface ConversationStep {
  role: 'user' | 'bot';
  message: string;
}

export interface TrainingFAQ {
  id: string;
  category_id: string;
  question: string;
  answer: string;
  related_questions?: string[];
  keywords?: string[];
  view_count: number;
  helpful_count: number;
  sort_order: number;
  status: string;
  created_at: string;
  updated_at: string;
  category?: TrainingCategory;
}

export interface TrainingStats {
  categories: number;
  phrases: number;
  scenarios: number;
  faqs: number;
}
