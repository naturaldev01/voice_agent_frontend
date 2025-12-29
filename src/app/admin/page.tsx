'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import {
  Users,
  MessageSquare,
  Phone,
  Clock,
  TrendingUp,
  Globe,
  ChevronRight,
  ArrowLeft,
  Activity,
  Flame,
  Thermometer,
  Snowflake,
  Search,
  Filter,
  X,
  User,
  Bot,
  FileText,
  Calendar,
  ThumbsUp,
  ThumbsDown,
  AlertTriangle,
  CheckCircle,
  Star,
  BookOpen,
  Edit,
  Trash2,
  ToggleLeft,
  ToggleRight,
  LogOut,
  Shield,
} from 'lucide-react';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

interface Patient {
  id: string;
  full_name: string;
  phone: string;
  email: string;
  country: string;
  language: string;
  interested_treatments: string[];
  created_at: string;
}

interface Conversation {
  id: string;
  patient_id: string;
  agent_name: string;
  language: string;
  status: 'active' | 'completed';
  lead_score: number;
  lead_status: 'hot' | 'warm' | 'cold';
  summary: string;
  started_at: string;
  ended_at: string;
  patients?: Patient;
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

interface ConversationDetail extends Conversation {
  conversation_messages?: Message[];
  patients?: Patient;
  is_evaluated?: boolean;
}

interface Evaluation {
  id: string;
  conversation_id: string;
  rating: 'bad' | 'needs_improvement' | 'good';
  feedback?: string;
  ideal_response?: string;
  evaluated_by?: string;
  evaluated_at: string;
}

interface MessageEvaluation {
  id: string;
  message_id: string;
  conversation_id: string;
  rating: 'bad' | 'neutral' | 'good';
  comment?: string;
  ideal_response?: string;
  evaluated_at: string;
}

interface KnowledgeEntry {
  id: string;
  source_message_id?: string;
  source_evaluation_id?: string;
  category: string;
  scenario: string;
  bad_response?: string;
  ideal_response: string;
  comment?: string;
  language: string;
  is_active: boolean;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

interface EvaluationStats {
  total: number;
  good: number;
  needs_improvement: number;
  bad: number;
}

interface Stats {
  totalPatients: number;
  totalConversations: number;
  activeConversations: number;
  hotLeads: number;
  warmLeads: number;
  coldLeads: number;
}

export default function AdminDashboard() {
  const { user, logout, loading: authLoading } = useAuth();
  const router = useRouter();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalPatients: 0,
    totalConversations: 0,
    activeConversations: 0,
    hotLeads: 0,
    warmLeads: 0,
    coldLeads: 0,
  });
  const [activeTab, setActiveTab] = useState<'overview' | 'patients' | 'conversations' | 'knowledge'>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [selectedConversation, setSelectedConversation] = useState<ConversationDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [currentEvaluation, setCurrentEvaluation] = useState<Evaluation | null>(null);
  const [evaluationStats, setEvaluationStats] = useState<EvaluationStats>({ total: 0, good: 0, needs_improvement: 0, bad: 0 });
  const [showEvaluationForm, setShowEvaluationForm] = useState(false);
  const [evaluationRating, setEvaluationRating] = useState<'bad' | 'needs_improvement' | 'good' | null>(null);
  const [evaluationFeedback, setEvaluationFeedback] = useState('');
  const [idealResponse, setIdealResponse] = useState('');
  const [submittingEvaluation, setSubmittingEvaluation] = useState(false);
  
  // Message-level evaluation state
  const [messageEvaluations, setMessageEvaluations] = useState<Record<string, MessageEvaluation>>({});
  const [activeMessageEval, setActiveMessageEval] = useState<string | null>(null);
  const [messageIdealResponse, setMessageIdealResponse] = useState('');
  const [messageComment, setMessageComment] = useState('');
  const [messageCategory, setMessageCategory] = useState('general');

  // Knowledge Base state
  const [knowledgeEntries, setKnowledgeEntries] = useState<KnowledgeEntry[]>([]);
  const [knowledgeLoading, setKnowledgeLoading] = useState(false);
  const [knowledgeFilter, setKnowledgeFilter] = useState({ language: '', category: '' });
  const [editingKnowledge, setEditingKnowledge] = useState<KnowledgeEntry | null>(null);

  const categories = [
    { value: 'general', label: 'Genel' },
    { value: 'greeting', label: 'Selamlama' },
    { value: 'treatment_info', label: 'Tedavi Bilgisi' },
    { value: 'pricing', label: 'Fiyatlandırma' },
    { value: 'language_switch', label: 'Dil Değişimi' },
    { value: 'photo_request', label: 'Fotoğraf İsteme' },
    { value: 'appointment', label: 'Randevu' },
    { value: 'closing', label: 'Kapanış' },
    { value: 'tone', label: 'Ton/Üslup' },
    { value: 'other', label: 'Diğer' },
  ];

  // Auth check
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (!authLoading && user && user.role !== 'admin') {
      router.push('/sales');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && user.role === 'admin') {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [patientsRes, conversationsRes, activeRes] = await Promise.all([
        fetch(`${BACKEND_URL}/patients?limit=100`),
        fetch(`${BACKEND_URL}/conversations?limit=100`),
        fetch(`${BACKEND_URL}/conversations/active`),
      ]);

      const patientsResponse = await patientsRes.json();
      const conversationsResponse = await conversationsRes.json();
      const activeResponse = await activeRes.json();

      // Handle both array and {data, count} response formats
      const patientsData = Array.isArray(patientsResponse) ? patientsResponse : (patientsResponse.data || []);
      const conversationsData = Array.isArray(conversationsResponse) ? conversationsResponse : (conversationsResponse.data || []);
      const activeData = Array.isArray(activeResponse) ? activeResponse : (activeResponse.data || []);

      setPatients(patientsData);
      setConversations(conversationsData);

      // Calculate stats
      const hotLeads = conversationsData.filter((c: Conversation) => c.lead_status === 'hot').length;
      const warmLeads = conversationsData.filter((c: Conversation) => c.lead_status === 'warm').length;
      const coldLeads = conversationsData.filter((c: Conversation) => c.lead_status === 'cold').length;

      setStats({
        totalPatients: patientsData.length,
        totalConversations: conversationsResponse.count || conversationsData.length,
        activeConversations: activeData.length,
        hotLeads,
        warmLeads,
        coldLeads,
      });
    // Fetch evaluation stats
      const evalStatsRes = await fetch(`${BACKEND_URL}/conversations/evaluations/stats`);
      if (evalStatsRes.ok) {
        const evalStats = await evalStatsRes.json();
        setEvaluationStats(evalStats);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredConversations = conversations.filter((c) => {
    const matchesSearch =
      c.agent_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.summary?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredPatients = patients.filter(
    (p) =>
      p.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.phone?.includes(searchTerm) ||
      p.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getLeadIcon = (status: string) => {
    switch (status) {
      case 'hot':
        return <Flame className="w-4 h-4 text-red-400" />;
      case 'warm':
        return <Thermometer className="w-4 h-4 text-yellow-400" />;
      case 'cold':
        return <Snowflake className="w-4 h-4 text-blue-400" />;
      default:
        return null;
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const openConversationDetail = async (conversationId: string) => {
    setLoadingDetail(true);
    setCurrentEvaluation(null);
    setShowEvaluationForm(false);
    resetEvaluationForm();
    setMessageEvaluations({});
    setActiveMessageEval(null);
    
    try {
      const [convRes, evalRes, msgEvalRes] = await Promise.all([
        fetch(`${BACKEND_URL}/conversations/${conversationId}`),
        fetch(`${BACKEND_URL}/conversations/${conversationId}/evaluation`),
        fetch(`${BACKEND_URL}/conversations/${conversationId}/message-evaluations`),
      ]);
      
      const convData = await convRes.json();
      setSelectedConversation(convData);
      
      if (evalRes.ok) {
        const evalData = await evalRes.json();
        if (evalData) {
          setCurrentEvaluation(evalData);
        }
      }

      if (msgEvalRes.ok) {
        const msgEvalData = await msgEvalRes.json();
        const evalMap: Record<string, MessageEvaluation> = {};
        msgEvalData.forEach((e: MessageEvaluation) => {
          evalMap[e.message_id] = e;
        });
        setMessageEvaluations(evalMap);
      }
    } catch (error) {
      console.error('Error fetching conversation detail:', error);
    } finally {
      setLoadingDetail(false);
    }
  };

  const closeDetail = () => {
    setSelectedConversation(null);
    setCurrentEvaluation(null);
    setShowEvaluationForm(false);
    resetEvaluationForm();
  };

  const resetEvaluationForm = () => {
    setEvaluationRating(null);
    setEvaluationFeedback('');
    setIdealResponse('');
  };

  const submitEvaluation = async () => {
    if (!selectedConversation || !evaluationRating) return;
    
    setSubmittingEvaluation(true);
    try {
      const res = await fetch(`${BACKEND_URL}/conversations/${selectedConversation.id}/evaluation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating: evaluationRating,
          feedback: evaluationFeedback || undefined,
          ideal_response: evaluationRating === 'bad' ? idealResponse : undefined,
        }),
      });

      if (res.ok) {
        const newEval = await res.json();
        setCurrentEvaluation(newEval);
        setShowEvaluationForm(false);
        // Refresh stats
        const statsRes = await fetch(`${BACKEND_URL}/conversations/evaluations/stats`);
        if (statsRes.ok) {
          setEvaluationStats(await statsRes.json());
        }
        // Refresh conversations list
        fetchData();
      }
    } catch (error) {
      console.error('Error submitting evaluation:', error);
    } finally {
      setSubmittingEvaluation(false);
    }
  };

  const getRatingIcon = (rating: string) => {
    switch (rating) {
      case 'good':
        return <ThumbsUp className="w-4 h-4 text-green-400" />;
      case 'needs_improvement':
        return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
      case 'bad':
        return <ThumbsDown className="w-4 h-4 text-red-400" />;
      default:
        return null;
    }
  };

  const getRatingLabel = (rating: string) => {
    switch (rating) {
      case 'good': return 'İyi';
      case 'needs_improvement': return 'Geliştirilebilir';
      case 'neutral': return 'Nötr';
      case 'bad': return 'Kötü';
      default: return rating;
    }
  };

  const submitMessageEvaluation = async (messageId: string, rating: 'bad' | 'neutral' | 'good') => {
    if (!selectedConversation) return;

    // If bad or neutral, we need more info first
    if ((rating === 'bad' || rating === 'neutral') && activeMessageEval !== messageId) {
      setActiveMessageEval(messageId);
      setMessageIdealResponse('');
      setMessageComment('');
      setMessageCategory('general');
      return;
    }

    try {
      const res = await fetch(
        `${BACKEND_URL}/conversations/${selectedConversation.id}/messages/${messageId}/evaluation`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rating,
            ideal_response: (rating === 'bad' || rating === 'neutral') ? messageIdealResponse : undefined,
            comment: messageComment || undefined,
            category: messageCategory,
          }),
        }
      );

      if (res.ok) {
        const newEval = await res.json();
        setMessageEvaluations((prev) => ({
          ...prev,
          [messageId]: newEval,
        }));
        setActiveMessageEval(null);
        setMessageIdealResponse('');
        setMessageComment('');
        setMessageCategory('general');
      }
    } catch (error) {
      console.error('Error submitting message evaluation:', error);
    }
  };

  const cancelMessageEvaluation = () => {
    setActiveMessageEval(null);
    setMessageIdealResponse('');
    setMessageComment('');
    setMessageCategory('general');
  };

  // Knowledge Base functions
  const fetchKnowledgeBase = async () => {
    setKnowledgeLoading(true);
    try {
      const params = new URLSearchParams();
      if (knowledgeFilter.language) params.append('language', knowledgeFilter.language);
      if (knowledgeFilter.category) params.append('category', knowledgeFilter.category);

      const res = await fetch(`${BACKEND_URL}/conversations/knowledge-base?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setKnowledgeEntries(data);
      }
    } catch (error) {
      console.error('Error fetching knowledge base:', error);
    } finally {
      setKnowledgeLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'knowledge') {
      fetchKnowledgeBase();
    }
  }, [activeTab, knowledgeFilter]);

  const toggleKnowledgeActive = async (id: string, currentActive: boolean) => {
    try {
      const res = await fetch(`${BACKEND_URL}/conversations/knowledge-base/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentActive }),
      });
      if (res.ok) {
        setKnowledgeEntries((prev) =>
          prev.map((entry) =>
            entry.id === id ? { ...entry, is_active: !currentActive } : entry
          )
        );
      }
    } catch (error) {
      console.error('Error toggling knowledge entry:', error);
    }
  };

  const updateKnowledgeEntry = async (id: string, updates: Partial<KnowledgeEntry>) => {
    try {
      const res = await fetch(`${BACKEND_URL}/conversations/knowledge-base/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const updated = await res.json();
        setKnowledgeEntries((prev) =>
          prev.map((entry) => (entry.id === id ? updated : entry))
        );
        setEditingKnowledge(null);
      }
    } catch (error) {
      console.error('Error updating knowledge entry:', error);
    }
  };

  // Auth loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500" />
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="bg-slate-800/50 border-b border-slate-700/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="p-2 rounded-lg bg-slate-700/50 hover:bg-slate-700 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-slate-300" />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-white">Admin Dashboard</h1>
                <p className="text-sm text-slate-400">Natural Clinic Voice Agent</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500/50 w-64"
                />
              </div>
              
              <button
                onClick={fetchData}
                className="p-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 transition-colors"
              >
                <Activity className="w-5 h-5" />
              </button>

              {/* User Menu */}
              {user && (
                <div className="flex items-center gap-3 ml-4 pl-4 border-l border-slate-700">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/10 border border-purple-500/20 rounded-full">
                    <Shield className="w-4 h-4 text-purple-400" />
                    <span className="text-sm text-purple-400 font-medium">Admin</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-white">{user.full_name}</p>
                    <p className="text-xs text-slate-400">{user.email}</p>
                  </div>
                  <button
                    onClick={logout}
                    className="p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                    title="Çıkış Yap"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-8">
          <StatCard
            icon={<Users className="w-5 h-5" />}
            label="Total Patients"
            value={stats.totalPatients}
            color="emerald"
          />
          <StatCard
            icon={<MessageSquare className="w-5 h-5" />}
            label="Conversations"
            value={stats.totalConversations}
            color="blue"
          />
          <StatCard
            icon={<Phone className="w-5 h-5" />}
            label="Active Calls"
            value={stats.activeConversations}
            color="purple"
          />
          <StatCard
            icon={<Flame className="w-5 h-5" />}
            label="Hot Leads"
            value={stats.hotLeads}
            color="red"
          />
          <StatCard
            icon={<Star className="w-5 h-5" />}
            label="Evaluated"
            value={evaluationStats.total}
            color="amber"
          />
        </div>

        {/* Evaluation Stats */}
        {evaluationStats.total > 0 && (
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 flex items-center gap-3">
              <ThumbsUp className="w-6 h-6 text-green-400" />
              <div>
                <p className="text-2xl font-bold text-green-400">{evaluationStats.good}</p>
                <p className="text-xs text-green-400/70">İyi</p>
              </div>
              <div className="ml-auto text-green-400/50 text-sm">
                {evaluationStats.total > 0 ? Math.round((evaluationStats.good / evaluationStats.total) * 100) : 0}%
              </div>
            </div>
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-yellow-400" />
              <div>
                <p className="text-2xl font-bold text-yellow-400">{evaluationStats.needs_improvement}</p>
                <p className="text-xs text-yellow-400/70">Geliştirilebilir</p>
              </div>
              <div className="ml-auto text-yellow-400/50 text-sm">
                {evaluationStats.total > 0 ? Math.round((evaluationStats.needs_improvement / evaluationStats.total) * 100) : 0}%
              </div>
            </div>
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3">
              <ThumbsDown className="w-6 h-6 text-red-400" />
              <div>
                <p className="text-2xl font-bold text-red-400">{evaluationStats.bad}</p>
                <p className="text-xs text-red-400/70">Kötü</p>
              </div>
              <div className="ml-auto text-red-400/50 text-sm">
                {evaluationStats.total > 0 ? Math.round((evaluationStats.bad / evaluationStats.total) * 100) : 0}%
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {(['overview', 'patients', 'conversations', 'knowledge'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                activeTab === tab
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              {tab === 'knowledge' && <BookOpen className="w-4 h-4" />}
              {tab === 'overview' ? 'Genel Bakış' : 
               tab === 'patients' ? 'Hastalar' : 
               tab === 'conversations' ? 'Konuşmalar' : 
               'Knowledge Base'}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
          </div>
        ) : activeTab === 'overview' ? (
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Recent Conversations */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6"
            >
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-emerald-400" />
                Recent Conversations
              </h2>
              <div className="space-y-3">
                {conversations.slice(0, 5).map((conv) => (
                  <div
                    key={conv.id}
                    className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg cursor-pointer hover:bg-slate-700/50 transition-colors"
                    onClick={() => openConversationDetail(conv.id)}
                  >
                    <div className="flex items-center gap-3">
                      {getLeadIcon(conv.lead_status)}
                      <div>
                        <p className="text-white font-medium">{conv.agent_name}</p>
                        <p className="text-xs text-slate-400">{formatDate(conv.started_at)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          conv.status === 'active'
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-slate-600/50 text-slate-300'
                        }`}
                      >
                        {conv.status}
                      </span>
                      <span className="text-sm text-slate-400">{conv.lead_score || 0}pts</span>
                      <ChevronRight className="w-4 h-4 text-slate-500" />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Recent Patients */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6"
            >
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-400" />
                Recent Patients
              </h2>
              <div className="space-y-3">
                {patients.slice(0, 5).map((patient) => (
                  <div
                    key={patient.id}
                    className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg"
                  >
                    <div>
                      <p className="text-white font-medium">{patient.full_name || 'Unknown'}</p>
                      <p className="text-xs text-slate-400">
                        {patient.country} • {patient.phone || 'No phone'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-slate-400" />
                      <span className="text-sm text-slate-400 uppercase">{patient.language}</span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        ) : activeTab === 'patients' ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden"
          >
            <table className="w-full">
              <thead className="bg-slate-700/30">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">
                    Contact
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">
                    Location
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">
                    Treatments
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {filteredPatients.map((patient) => (
                  <tr key={patient.id} className="hover:bg-slate-700/20">
                    <td className="px-4 py-3 text-white">{patient.full_name || '-'}</td>
                    <td className="px-4 py-3">
                      <p className="text-white">{patient.phone || '-'}</p>
                      <p className="text-xs text-slate-400">{patient.email || '-'}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{patient.country || '-'}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {patient.interested_treatments?.slice(0, 2).map((t, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded text-xs"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-sm">
                      {formatDate(patient.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        ) : activeTab === 'conversations' ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden"
          >
            {/* Filter */}
            <div className="p-4 border-b border-slate-700/50 flex items-center gap-4">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-700/50 border border-slate-600/50 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <table className="w-full">
              <thead className="bg-slate-700/30">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">
                    Agent
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">
                    Language
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">
                    Lead
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">
                    Summary
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">
                    Started
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {filteredConversations.map((conv) => (
                  <tr 
                    key={conv.id} 
                    className="hover:bg-slate-700/20 cursor-pointer transition-colors"
                    onClick={() => openConversationDetail(conv.id)}
                  >
                    <td className="px-4 py-3 text-white">{conv.agent_name}</td>
                    <td className="px-4 py-3 text-slate-300 uppercase">{conv.language}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          conv.status === 'active'
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-slate-600/50 text-slate-300'
                        }`}
                      >
                        {conv.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {getLeadIcon(conv.lead_status)}
                        <span className="text-slate-300">{conv.lead_score || 0}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-sm max-w-xs truncate">
                      {conv.summary || '-'}
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-sm">
                      {formatDate(conv.started_at)}
                      <ChevronRight className="w-4 h-4 inline ml-2 text-slate-500" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        ) : activeTab === 'knowledge' ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden"
          >
            {/* Knowledge Base Header */}
            <div className="p-4 border-b border-slate-700 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <BookOpen className="w-6 h-6 text-emerald-400" />
                <div>
                  <h2 className="text-lg font-semibold text-white">AI Knowledge Base</h2>
                  <p className="text-sm text-slate-400">
                    AI bu bilgilerden öğrenir ve gelecek konuşmalarda uygular
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <select
                  value={knowledgeFilter.language}
                  onChange={(e) => setKnowledgeFilter((f) => ({ ...f, language: e.target.value }))}
                  className="bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white"
                >
                  <option value="">Tüm Diller</option>
                  <option value="tr">Türkçe</option>
                  <option value="en">English</option>
                  <option value="de">Deutsch</option>
                  <option value="ar">العربية</option>
                  <option value="fr">Français</option>
                  <option value="ru">Русский</option>
                </select>
                <select
                  value={knowledgeFilter.category}
                  onChange={(e) => setKnowledgeFilter((f) => ({ ...f, category: e.target.value }))}
                  className="bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white"
                >
                  <option value="">Tüm Kategoriler</option>
                  {categories.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Knowledge Entries */}
            {knowledgeLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
              </div>
            ) : knowledgeEntries.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                <BookOpen className="w-12 h-12 mb-3 opacity-50" />
                <p>Henüz knowledge base kaydı yok</p>
                <p className="text-sm text-slate-500">
                  Mesaj değerlendirmelerinden otomatik oluşturulacak
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-700/50">
                {knowledgeEntries.map((entry) => (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={`p-4 hover:bg-slate-700/20 transition-colors ${
                      !entry.is_active ? 'opacity-50' : ''
                    }`}
                  >
                    {editingKnowledge?.id === entry.id ? (
                      /* Edit Mode */
                      <div className="space-y-3">
                        <div className="grid md:grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs text-slate-400">Kategori</label>
                            <select
                              value={editingKnowledge.category}
                              onChange={(e) =>
                                setEditingKnowledge((prev) =>
                                  prev ? { ...prev, category: e.target.value } : null
                                )
                              }
                              className="w-full mt-1 bg-slate-700/50 border border-slate-600 rounded-lg p-2 text-sm text-white"
                            >
                              {categories.map((cat) => (
                                <option key={cat.value} value={cat.value}>
                                  {cat.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="text-xs text-slate-400">Senaryo</label>
                            <input
                              value={editingKnowledge.scenario}
                              onChange={(e) =>
                                setEditingKnowledge((prev) =>
                                  prev ? { ...prev, scenario: e.target.value } : null
                                )
                              }
                              className="w-full mt-1 bg-slate-700/50 border border-slate-600 rounded-lg p-2 text-sm text-white"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-xs text-slate-400">İdeal Cevap</label>
                          <textarea
                            value={editingKnowledge.ideal_response}
                            onChange={(e) =>
                              setEditingKnowledge((prev) =>
                                prev ? { ...prev, ideal_response: e.target.value } : null
                              )
                            }
                            className="w-full mt-1 bg-slate-700/50 border border-slate-600 rounded-lg p-2 text-sm text-white resize-none"
                            rows={3}
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setEditingKnowledge(null)}
                            className="px-3 py-1.5 text-sm text-slate-400 hover:text-white"
                          >
                            İptal
                          </button>
                          <button
                            onClick={() =>
                              updateKnowledgeEntry(entry.id, {
                                category: editingKnowledge.category,
                                scenario: editingKnowledge.scenario,
                                ideal_response: editingKnowledge.ideal_response,
                              })
                            }
                            className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg"
                          >
                            Kaydet
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* View Mode */
                      <div className="flex gap-4">
                        <div className="flex-1 space-y-2">
                          {/* Meta info */}
                          <div className="flex items-center gap-2 text-xs">
                            <span className="px-2 py-0.5 bg-slate-700 text-slate-300 rounded">
                              {categories.find((c) => c.value === entry.category)?.label ||
                                entry.category}
                            </span>
                            <span className="px-2 py-0.5 bg-slate-700 text-slate-300 rounded uppercase">
                              {entry.language}
                            </span>
                            <span className="text-slate-500">
                              {new Date(entry.created_at).toLocaleDateString('tr-TR')}
                            </span>
                          </div>

                          {/* Scenario */}
                          <div className="text-sm text-slate-400">
                            <span className="font-medium text-slate-300">Senaryo:</span>{' '}
                            {entry.scenario}
                          </div>

                          {/* Bad response */}
                          {entry.bad_response && (
                            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                              <div className="text-xs text-red-400 font-medium mb-1 flex items-center gap-1">
                                <ThumbsDown className="w-3 h-3" /> Yanlış Cevap
                              </div>
                              <p className="text-sm text-red-200">{entry.bad_response}</p>
                            </div>
                          )}

                          {/* Ideal response */}
                          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                            <div className="text-xs text-green-400 font-medium mb-1 flex items-center gap-1">
                              <ThumbsUp className="w-3 h-3" /> Doğru Cevap
                            </div>
                            <p className="text-sm text-green-200">{entry.ideal_response}</p>
                          </div>

                          {/* Comment */}
                          {entry.comment && (
                            <div className="text-xs text-slate-500 italic">
                              💬 {entry.comment}
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => toggleKnowledgeActive(entry.id, entry.is_active)}
                            className={`p-2 rounded-lg transition-colors ${
                              entry.is_active
                                ? 'hover:bg-yellow-500/20 text-yellow-400'
                                : 'hover:bg-green-500/20 text-green-400'
                            }`}
                            title={entry.is_active ? 'Deaktif Et' : 'Aktif Et'}
                          >
                            {entry.is_active ? (
                              <ToggleRight className="w-5 h-5" />
                            ) : (
                              <ToggleLeft className="w-5 h-5" />
                            )}
                          </button>
                          <button
                            onClick={() => setEditingKnowledge(entry)}
                            className="p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                            title="Düzenle"
                          >
                            <Edit className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        ) : null}
      </div>

      {/* Conversation Detail Modal */}
      <AnimatePresence>
        {selectedConversation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={closeDetail}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-800 rounded-2xl border border-slate-700 w-full max-w-4xl max-h-[85vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {loadingDetail ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
                </div>
              ) : (
                <>
                  {/* Modal Header */}
                  <div className="flex items-center justify-between p-6 border-b border-slate-700">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                        <Bot className="w-6 h-6 text-emerald-400" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-white">
                          {selectedConversation.agent_name}
                        </h2>
                        <div className="flex items-center gap-3 text-sm text-slate-400">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {formatDate(selectedConversation.started_at)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Globe className="w-4 h-4" />
                            {selectedConversation.language?.toUpperCase()}
                          </span>
                          <span className="flex items-center gap-1">
                            {getLeadIcon(selectedConversation.lead_status)}
                            {selectedConversation.lead_score || 0} pts
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={closeDetail}
                      className="p-2 rounded-lg hover:bg-slate-700 transition-colors"
                    >
                      <X className="w-5 h-5 text-slate-400" />
                    </button>
                  </div>

                  <div className="grid md:grid-cols-3 divide-x divide-slate-700">
                    {/* Conversation Info */}
                    <div className="p-6 space-y-4">
                      <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">
                        Conversation Info
                      </h3>
                      
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs text-slate-500">Status</p>
                          <span
                            className={`inline-block px-2 py-1 rounded text-xs font-medium mt-1 ${
                              selectedConversation.status === 'active'
                                ? 'bg-green-500/20 text-green-400'
                                : 'bg-slate-600/50 text-slate-300'
                            }`}
                          >
                            {selectedConversation.status}
                          </span>
                        </div>

                        <div>
                          <p className="text-xs text-slate-500">Started</p>
                          <p className="text-white">{formatDate(selectedConversation.started_at)}</p>
                        </div>

                        {selectedConversation.ended_at && (
                          <div>
                            <p className="text-xs text-slate-500">Ended</p>
                            <p className="text-white">{formatDate(selectedConversation.ended_at)}</p>
                          </div>
                        )}

                        <div>
                          <p className="text-xs text-slate-500">Lead Score</p>
                          <div className="flex items-center gap-2 mt-1">
                            {getLeadIcon(selectedConversation.lead_status)}
                            <span className="text-white font-medium">
                              {selectedConversation.lead_score || 0} / 100
                            </span>
                            <span className={`text-xs uppercase ${
                              selectedConversation.lead_status === 'hot' ? 'text-red-400' :
                              selectedConversation.lead_status === 'warm' ? 'text-yellow-400' :
                              'text-blue-400'
                            }`}>
                              ({selectedConversation.lead_status || 'cold'})
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Patient Info */}
                      {selectedConversation.patients && (
                        <>
                          <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider pt-4">
                            Patient Info
                          </h3>
                          <div className="space-y-2">
                            <div>
                              <p className="text-xs text-slate-500">Name</p>
                              <p className="text-white">{selectedConversation.patients.full_name || '-'}</p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500">Phone</p>
                              <p className="text-white">{selectedConversation.patients.phone || '-'}</p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500">Email</p>
                              <p className="text-white">{selectedConversation.patients.email || '-'}</p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500">Country</p>
                              <p className="text-white">{selectedConversation.patients.country || '-'}</p>
                            </div>
                          </div>
                        </>
                      )}

                      {/* Summary */}
                      {selectedConversation.summary && (
                        <>
                          <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider pt-4">
                            AI Summary
                          </h3>
                          <p className="text-slate-300 text-sm leading-relaxed">
                            {selectedConversation.summary}
                          </p>
                        </>
                      )}

                      {/* Evaluation Section */}
                      <div className="pt-4 border-t border-slate-700 mt-4">
                        <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                          <Star className="w-4 h-4" />
                          Değerlendirme
                        </h3>

                        {currentEvaluation && !showEvaluationForm ? (
                          // Show existing evaluation
                          <div className="space-y-3">
                            <div className={`flex items-center gap-2 p-3 rounded-lg ${
                              currentEvaluation.rating === 'good' ? 'bg-green-500/10 border border-green-500/20' :
                              currentEvaluation.rating === 'needs_improvement' ? 'bg-yellow-500/10 border border-yellow-500/20' :
                              'bg-red-500/10 border border-red-500/20'
                            }`}>
                              {getRatingIcon(currentEvaluation.rating)}
                              <span className={`font-medium ${
                                currentEvaluation.rating === 'good' ? 'text-green-400' :
                                currentEvaluation.rating === 'needs_improvement' ? 'text-yellow-400' :
                                'text-red-400'
                              }`}>
                                {getRatingLabel(currentEvaluation.rating)}
                              </span>
                            </div>
                            
                            {currentEvaluation.feedback && (
                              <div>
                                <p className="text-xs text-slate-500 mb-1">Geri Bildirim</p>
                                <p className="text-sm text-slate-300">{currentEvaluation.feedback}</p>
                              </div>
                            )}
                            
                            {currentEvaluation.ideal_response && (
                              <div>
                                <p className="text-xs text-slate-500 mb-1">İdeal Cevap</p>
                                <p className="text-sm text-slate-300 bg-slate-700/30 p-2 rounded">
                                  {currentEvaluation.ideal_response}
                                </p>
                              </div>
                            )}

                            <button
                              onClick={() => {
                                setShowEvaluationForm(true);
                                setEvaluationRating(currentEvaluation.rating);
                                setEvaluationFeedback(currentEvaluation.feedback || '');
                                setIdealResponse(currentEvaluation.ideal_response || '');
                              }}
                              className="text-sm text-slate-400 hover:text-white transition-colors"
                            >
                              Düzenle
                            </button>
                          </div>
                        ) : showEvaluationForm ? (
                          // Show evaluation form
                          <div className="space-y-4">
                            {/* Rating buttons */}
                            <div className="flex gap-2">
                              <button
                                onClick={() => setEvaluationRating('good')}
                                className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border transition-all ${
                                  evaluationRating === 'good'
                                    ? 'bg-green-500/20 border-green-500/50 text-green-400'
                                    : 'border-slate-600 text-slate-400 hover:border-green-500/30'
                                }`}
                              >
                                <ThumbsUp className="w-4 h-4" />
                                <span className="text-sm font-medium">İyi</span>
                              </button>
                              <button
                                onClick={() => setEvaluationRating('needs_improvement')}
                                className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border transition-all ${
                                  evaluationRating === 'needs_improvement'
                                    ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400'
                                    : 'border-slate-600 text-slate-400 hover:border-yellow-500/30'
                                }`}
                              >
                                <AlertTriangle className="w-4 h-4" />
                                <span className="text-sm font-medium">Geliştirilebilir</span>
                              </button>
                              <button
                                onClick={() => setEvaluationRating('bad')}
                                className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border transition-all ${
                                  evaluationRating === 'bad'
                                    ? 'bg-red-500/20 border-red-500/50 text-red-400'
                                    : 'border-slate-600 text-slate-400 hover:border-red-500/30'
                                }`}
                              >
                                <ThumbsDown className="w-4 h-4" />
                                <span className="text-sm font-medium">Kötü</span>
                              </button>
                            </div>

                            {/* Feedback textarea */}
                            <div>
                              <label className="text-xs text-slate-500 mb-1 block">
                                Geri Bildirim (Opsiyonel)
                              </label>
                              <textarea
                                value={evaluationFeedback}
                                onChange={(e) => setEvaluationFeedback(e.target.value)}
                                placeholder="Konuşma hakkında notlarınız..."
                                className="w-full bg-slate-700/50 border border-slate-600 rounded-lg p-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 resize-none"
                                rows={2}
                              />
                            </div>

                            {/* Ideal response (only for bad rating) */}
                            {evaluationRating === 'bad' && (
                              <div>
                                <label className="text-xs text-slate-500 mb-1 block">
                                  İdeal Cevap Nasıl Olmalıydı? <span className="text-red-400">*</span>
                                </label>
                                <textarea
                                  value={idealResponse}
                                  onChange={(e) => setIdealResponse(e.target.value)}
                                  placeholder="AI nasıl cevap vermeliydi..."
                                  className="w-full bg-slate-700/50 border border-slate-600 rounded-lg p-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 resize-none"
                                  rows={3}
                                />
                              </div>
                            )}

                            {/* Action buttons */}
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  setShowEvaluationForm(false);
                                  resetEvaluationForm();
                                }}
                                className="flex-1 px-3 py-2 text-sm text-slate-400 hover:text-white transition-colors"
                              >
                                İptal
                              </button>
                              <button
                                onClick={submitEvaluation}
                                disabled={!evaluationRating || (evaluationRating === 'bad' && !idealResponse) || submittingEvaluation}
                                className="flex-1 px-3 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                              >
                                {submittingEvaluation ? (
                                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                  <>
                                    <CheckCircle className="w-4 h-4" />
                                    Kaydet
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        ) : (
                          // Show evaluate button
                          <button
                            onClick={() => setShowEvaluationForm(true)}
                            className="w-full py-3 border border-dashed border-slate-600 rounded-lg text-slate-400 hover:text-white hover:border-emerald-500/50 transition-colors flex items-center justify-center gap-2"
                          >
                            <Star className="w-4 h-4" />
                            Bu Konuşmayı Değerlendir
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Messages */}
                    <div className="md:col-span-2 flex flex-col max-h-[60vh]">
                      <div className="p-4 border-b border-slate-700">
                        <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider flex items-center gap-2">
                          <MessageSquare className="w-4 h-4" />
                          Transcript ({selectedConversation.conversation_messages?.length || 0} messages)
                        </h3>
                      </div>
                      
                      <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {selectedConversation.conversation_messages?.length ? (
                          selectedConversation.conversation_messages.map((msg) => {
                            const msgEval = messageEvaluations[msg.id];
                            const isEvaluating = activeMessageEval === msg.id;
                            
                            return (
                              <div key={msg.id} className="space-y-2">
                                <div className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                                    msg.role === 'user' 
                                      ? 'bg-blue-500/20' 
                                      : 'bg-emerald-500/20'
                                  }`}>
                                    {msg.role === 'user' 
                                      ? <User className="w-4 h-4 text-blue-400" />
                                      : <Bot className="w-4 h-4 text-emerald-400" />
                                    }
                                  </div>
                                  <div className={`max-w-[80%] ${msg.role === 'user' ? 'text-right' : ''}`}>
                                    <div className={`inline-block p-3 rounded-2xl text-sm ${
                                      msg.role === 'user'
                                        ? 'bg-blue-500/20 text-blue-100 rounded-tr-sm'
                                        : 'bg-slate-700/50 text-slate-200 rounded-tl-sm'
                                    }`}>
                                      {msg.content}
                                    </div>
                                    
                                    {/* Evaluation buttons for AI messages */}
                                    {msg.role === 'assistant' && (
                                      <div className="flex items-center gap-2 mt-2">
                                        <span className="text-xs text-slate-500">Değerlendir:</span>
                                        
                                        {/* Show existing evaluation or buttons */}
                                        {msgEval && !isEvaluating ? (
                                          <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
                                            msgEval.rating === 'good' ? 'bg-green-500/20 text-green-400' :
                                            msgEval.rating === 'neutral' ? 'bg-yellow-500/20 text-yellow-400' :
                                            'bg-red-500/20 text-red-400'
                                          }`}>
                                            {msgEval.rating === 'good' ? <ThumbsUp className="w-3 h-3" /> :
                                             msgEval.rating === 'neutral' ? <AlertTriangle className="w-3 h-3" /> :
                                             <ThumbsDown className="w-3 h-3" />}
                                            <span>{getRatingLabel(msgEval.rating)}</span>
                                          </div>
                                        ) : (
                                          <div className="flex items-center gap-1">
                                            <button
                                              onClick={() => submitMessageEvaluation(msg.id, 'good')}
                                              className={`p-1.5 rounded transition-colors ${
                                                msgEval?.rating === 'good' 
                                                  ? 'bg-green-500/30 text-green-400' 
                                                  : 'hover:bg-green-500/20 text-slate-400 hover:text-green-400'
                                              }`}
                                              title="İyi"
                                            >
                                              <ThumbsUp className="w-4 h-4" />
                                            </button>
                                            <button
                                              onClick={() => submitMessageEvaluation(msg.id, 'neutral')}
                                              className={`p-1.5 rounded transition-colors ${
                                                msgEval?.rating === 'neutral' 
                                                  ? 'bg-yellow-500/30 text-yellow-400' 
                                                  : 'hover:bg-yellow-500/20 text-slate-400 hover:text-yellow-400'
                                              }`}
                                              title="Geliştirilebilir"
                                            >
                                              <AlertTriangle className="w-4 h-4" />
                                            </button>
                                            <button
                                              onClick={() => submitMessageEvaluation(msg.id, 'bad')}
                                              className={`p-1.5 rounded transition-colors ${
                                                msgEval?.rating === 'bad' 
                                                  ? 'bg-red-500/30 text-red-400' 
                                                  : 'hover:bg-red-500/20 text-slate-400 hover:text-red-400'
                                              }`}
                                              title="Kötü"
                                            >
                                              <ThumbsDown className="w-4 h-4" />
                                            </button>
                                          </div>
                                        )}
                                        
                                        <span className="text-xs text-slate-500 ml-2">
                                          {new Date(msg.timestamp).toLocaleTimeString('tr-TR', {
                                            hour: '2-digit',
                                            minute: '2-digit'
                                          })}
                                        </span>
                                      </div>
                                    )}
                                    
                                    {/* User message timestamp */}
                                    {msg.role === 'user' && (
                                      <p className="text-xs text-slate-500 mt-1">
                                        {new Date(msg.timestamp).toLocaleTimeString('tr-TR', {
                                          hour: '2-digit',
                                          minute: '2-digit'
                                        })}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                {/* Evaluation form for bad/neutral rating */}
                                {isEvaluating && (
                                  <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    className="ml-11 bg-slate-700/30 border border-slate-600 rounded-lg p-4 space-y-3"
                                  >
                                    <p className="text-sm font-medium text-white">
                                      Mesaj Değerlendirmesi
                                    </p>

                                    {/* Category selection */}
                                    <div>
                                      <label className="text-xs text-slate-400 mb-1 block">Kategori</label>
                                      <select
                                        value={messageCategory}
                                        onChange={(e) => setMessageCategory(e.target.value)}
                                        className="w-full bg-slate-800/50 border border-slate-600 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                                      >
                                        {categories.map((cat) => (
                                          <option key={cat.value} value={cat.value}>
                                            {cat.label}
                                          </option>
                                        ))}
                                      </select>
                                    </div>

                                    {/* Comment */}
                                    <div>
                                      <label className="text-xs text-slate-400 mb-1 block">
                                        Neden bu değerlendirmeyi yaptınız?
                                      </label>
                                      <textarea
                                        value={messageComment}
                                        onChange={(e) => setMessageComment(e.target.value)}
                                        placeholder="Örn: Çok resmi bir dil kullanmış, daha samimi olmalıydı..."
                                        className="w-full bg-slate-800/50 border border-slate-600 rounded-lg p-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 resize-none"
                                        rows={2}
                                      />
                                    </div>

                                    {/* Ideal response */}
                                    <div>
                                      <label className="text-xs text-slate-400 mb-1 block">
                                        İdeal cevap nasıl olmalıydı? <span className="text-red-400">*</span>
                                      </label>
                                      <textarea
                                        value={messageIdealResponse}
                                        onChange={(e) => setMessageIdealResponse(e.target.value)}
                                        placeholder="AI şu şekilde cevap vermeliydi..."
                                        className="w-full bg-slate-800/50 border border-slate-600 rounded-lg p-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 resize-none"
                                        rows={3}
                                        autoFocus
                                      />
                                    </div>

                                    <p className="text-xs text-slate-500">
                                      💡 Bu değerlendirme AI Knowledge Base'e eklenecek ve AI bundan öğrenecek.
                                    </p>

                                    {/* Action buttons */}
                                    <div className="flex gap-2 pt-2 border-t border-slate-600">
                                      <button
                                        onClick={cancelMessageEvaluation}
                                        className="px-3 py-2 text-sm text-slate-400 hover:text-white"
                                      >
                                        İptal
                                      </button>
                                      <button
                                        onClick={() => submitMessageEvaluation(msg.id, 'neutral')}
                                        disabled={!messageIdealResponse.trim()}
                                        className="px-4 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/30 disabled:bg-slate-600 disabled:border-slate-600 disabled:cursor-not-allowed text-yellow-400 disabled:text-slate-500 text-sm font-medium rounded-lg transition-colors flex items-center gap-1"
                                      >
                                        <AlertTriangle className="w-4 h-4" />
                                        Geliştirilebilir
                                      </button>
                                      <button
                                        onClick={() => submitMessageEvaluation(msg.id, 'bad')}
                                        disabled={!messageIdealResponse.trim()}
                                        className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 disabled:bg-slate-600 disabled:border-slate-600 disabled:cursor-not-allowed text-red-400 disabled:text-slate-500 text-sm font-medium rounded-lg transition-colors flex items-center gap-1"
                                      >
                                        <ThumbsDown className="w-4 h-4" />
                                        Kötü
                                      </button>
                                    </div>
                                  </motion.div>
                                )}

                                {/* Show existing ideal response */}
                                {msgEval?.ideal_response && !isEvaluating && (
                                  <div className="ml-11 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                                    <p className="text-xs text-red-400 mb-1">İdeal Cevap:</p>
                                    <p className="text-sm text-slate-300">{msgEval.ideal_response}</p>
                                  </div>
                                )}
                              </div>
                            );
                          })
                        ) : (
                          <div className="flex flex-col items-center justify-center h-full text-slate-500">
                            <FileText className="w-12 h-12 mb-2 opacity-50" />
                            <p>No messages recorded</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}) {
  const colorClasses: Record<string, string> = {
    emerald: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    purple: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    red: 'bg-red-500/20 text-red-400 border-red-500/30',
    yellow: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    cyan: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`p-4 rounded-xl border ${colorClasses[color]}`}
    >
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs font-medium opacity-80">{label}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </motion.div>
  );
}

