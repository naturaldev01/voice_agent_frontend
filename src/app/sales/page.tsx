'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import {
  MessageSquare,
  Clock,
  Globe,
  ChevronRight,
  LogOut,
  User,
  Bot,
  ThumbsUp,
  ThumbsDown,
  AlertTriangle,
  Calendar,
  Flame,
  Thermometer,
  Snowflake,
  X,
  CheckCircle,
  Filter,
  RefreshCw,
} from 'lucide-react';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

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
  patients?: {
    full_name: string;
    phone: string;
    country: string;
  };
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

interface MessageEvaluation {
  id: string;
  message_id: string;
  rating: 'bad' | 'neutral' | 'good';
  comment?: string;
  ideal_response?: string;
}

interface ConversationDetail extends Conversation {
  conversation_messages?: Message[];
}

export default function SalesDashboard() {
  const { user, logout, loading: authLoading } = useAuth();
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConversation, setSelectedConversation] = useState<ConversationDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [messageEvaluations, setMessageEvaluations] = useState<Record<string, MessageEvaluation>>({});
  const [activeMessageEval, setActiveMessageEval] = useState<string | null>(null);
  const [messageIdealResponse, setMessageIdealResponse] = useState('');
  const [messageComment, setMessageComment] = useState('');
  const [messageCategory, setMessageCategory] = useState('general');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [evaluatedCount, setEvaluatedCount] = useState(0);

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

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      fetchConversations();
    }
  }, [user]);

  const fetchConversations = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/conversations?limit=100&status=completed`);
      const data = await res.json();
      const conversationsData = Array.isArray(data) ? data : (data.data || []);
      setConversations(conversationsData);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const openConversationDetail = async (conversationId: string) => {
    setLoadingDetail(true);
    try {
      const [convRes, messagesRes, evalsRes] = await Promise.all([
        fetch(`${BACKEND_URL}/conversations/${conversationId}`),
        fetch(`${BACKEND_URL}/conversations/${conversationId}/messages`),
        fetch(`${BACKEND_URL}/conversations/${conversationId}/message-evaluations`),
      ]);

      const conversation = await convRes.json();
      const messages = await messagesRes.json();
      const evaluations = await evalsRes.json();

      setSelectedConversation({
        ...conversation,
        conversation_messages: messages,
      });

      // Convert evaluations array to record
      const evalsRecord: Record<string, MessageEvaluation> = {};
      if (Array.isArray(evaluations)) {
        evaluations.forEach((ev: MessageEvaluation) => {
          evalsRecord[ev.message_id] = ev;
        });
      }
      setMessageEvaluations(evalsRecord);
    } catch (error) {
      console.error('Error fetching conversation detail:', error);
    } finally {
      setLoadingDetail(false);
    }
  };

  const closeDetail = () => {
    setSelectedConversation(null);
    setMessageEvaluations({});
    setActiveMessageEval(null);
  };

  const submitMessageEvaluation = async (messageId: string, rating: 'bad' | 'neutral' | 'good') => {
    if (!selectedConversation) return;

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
            evaluated_by: user?.full_name,
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
        setEvaluatedCount((c) => c + 1);
      }
    } catch (error) {
      console.error('Error submitting evaluation:', error);
    }
  };

  const cancelMessageEvaluation = () => {
    setActiveMessageEval(null);
    setMessageIdealResponse('');
    setMessageComment('');
    setMessageCategory('general');
  };

  const getLeadIcon = (status?: string) => {
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

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getRatingLabel = (rating: string) => {
    switch (rating) {
      case 'good':
        return 'İyi';
      case 'neutral':
        return 'Geliştirilebilir';
      case 'bad':
        return 'Kötü';
      default:
        return rating;
    }
  };

  const filteredConversations = conversations.filter((c) => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'completed') return c.status === 'completed';
    return c.lead_status === statusFilter;
  });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
                <span className="text-lg font-black text-white">NC</span>
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">Sales Dashboard</h1>
                <p className="text-xs text-slate-400">AI Konuşma Değerlendirme</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span className="text-sm text-emerald-400 font-medium">
                  {evaluatedCount} değerlendirme
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-white">{user.full_name}</p>
                  <p className="text-xs text-slate-400 capitalize">{user.role}</p>
                </div>
                <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-slate-300" />
                </div>
                <button
                  onClick={logout}
                  className="p-2 text-slate-400 hover:text-white transition-colors"
                  title="Çıkış Yap"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-xl p-6 mb-8"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <MessageSquare className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white mb-1">AI Konuşmalarını Değerlendirin</h2>
              <p className="text-slate-400 text-sm">
                Aşağıdaki konuşmalara tıklayarak AI'ın verdiği cevapları değerlendirin. 
                Kötü veya geliştirilebilir cevaplar için ideal cevabı girin. 
                Bu bilgiler AI'ın öğrenmesi için kullanılacak.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Filter Bar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Filter className="w-5 h-5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
            >
              <option value="all">Tüm Konuşmalar</option>
              <option value="completed">Tamamlanan</option>
              <option value="hot">🔥 Sıcak Leadler</option>
              <option value="warm">🌡️ Ilık Leadler</option>
              <option value="cold">❄️ Soğuk Leadler</option>
            </select>
          </div>

          <button
            onClick={fetchConversations}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-300 hover:text-white hover:border-slate-600 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Yenile
          </button>
        </div>

        {/* Conversations List */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredConversations.map((conv) => (
              <motion.div
                key={conv.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => openConversationDetail(conv.id)}
                className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 hover:border-emerald-500/30 hover:bg-slate-800/70 cursor-pointer transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center">
                      <Bot className="w-6 h-6 text-emerald-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-white">{conv.agent_name}</h3>
                        <span className="px-2 py-0.5 bg-slate-700 text-slate-300 text-xs rounded uppercase">
                          {conv.language}
                        </span>
                        {getLeadIcon(conv.lead_status)}
                      </div>
                      <p className="text-sm text-slate-400 mt-1 line-clamp-1">
                        {conv.summary || 'Özet yok'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-sm text-slate-300 flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {formatDate(conv.started_at)}
                      </p>
                      {conv.patients?.full_name && (
                        <p className="text-xs text-slate-500 mt-1">
                          {conv.patients.full_name}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-emerald-400 transition-colors" />
                  </div>
                </div>
              </motion.div>
            ))}

            {filteredConversations.length === 0 && (
              <div className="text-center py-16 text-slate-400">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Henüz değerlendirilecek konuşma yok</p>
              </div>
            )}
          </div>
        )}
      </main>

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
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl"
            >
              {loadingDetail ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
                </div>
              ) : (
                <>
                  {/* Modal Header */}
                  <div className="flex items-center justify-between p-6 border-b border-slate-700 sticky top-0 bg-slate-900 z-10">
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

                  {/* Instruction */}
                  <div className="px-6 py-3 bg-amber-500/10 border-b border-amber-500/20">
                    <p className="text-sm text-amber-300 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      AI mesajlarının yanındaki butonları kullanarak değerlendirin. 
                      Kötü/Geliştirilebilir için ideal cevap girmeniz gerekir.
                    </p>
                  </div>

                  {/* Messages */}
                  <div className="p-6 overflow-y-auto max-h-[60vh] space-y-4">
                    {selectedConversation.conversation_messages?.map((msg) => {
                      const isAssistant = msg.role === 'assistant';
                      const msgEval = messageEvaluations[msg.id];
                      const isEvaluating = activeMessageEval === msg.id;

                      if (msg.role === 'system') return null;

                      return (
                        <div key={msg.id}>
                          <div
                            className={`flex ${isAssistant ? 'justify-start' : 'justify-end'}`}
                          >
                            <div
                              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                                isAssistant
                                  ? 'bg-slate-800 border border-slate-700'
                                  : 'bg-emerald-600'
                              }`}
                            >
                              <div className="flex items-start gap-2">
                                {isAssistant && (
                                  <Bot className="w-4 h-4 text-emerald-400 mt-1 flex-shrink-0" />
                                )}
                                <div className="flex-1">
                                  <p className="text-sm text-white whitespace-pre-wrap">
                                    {msg.content}
                                  </p>
                                </div>
                              </div>

                              {/* AI Message Actions */}
                              {isAssistant && (
                                <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-700">
                                  {msgEval ? (
                                    <span
                                      className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${
                                        msgEval.rating === 'good'
                                          ? 'bg-green-500/20 text-green-400'
                                          : msgEval.rating === 'neutral'
                                          ? 'bg-yellow-500/20 text-yellow-400'
                                          : 'bg-red-500/20 text-red-400'
                                      }`}
                                    >
                                      {msgEval.rating === 'good' ? (
                                        <ThumbsUp className="w-3 h-3" />
                                      ) : msgEval.rating === 'neutral' ? (
                                        <AlertTriangle className="w-3 h-3" />
                                      ) : (
                                        <ThumbsDown className="w-3 h-3" />
                                      )}
                                      {getRatingLabel(msgEval.rating)}
                                    </span>
                                  ) : (
                                    <div className="flex items-center gap-1">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          submitMessageEvaluation(msg.id, 'good');
                                        }}
                                        className="p-1.5 rounded hover:bg-green-500/20 text-slate-400 hover:text-green-400 transition-colors"
                                        title="İyi"
                                      >
                                        <ThumbsUp className="w-4 h-4" />
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          submitMessageEvaluation(msg.id, 'neutral');
                                        }}
                                        className="p-1.5 rounded hover:bg-yellow-500/20 text-slate-400 hover:text-yellow-400 transition-colors"
                                        title="Geliştirilebilir"
                                      >
                                        <AlertTriangle className="w-4 h-4" />
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          submitMessageEvaluation(msg.id, 'bad');
                                        }}
                                        className="p-1.5 rounded hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors"
                                        title="Kötü"
                                      >
                                        <ThumbsDown className="w-4 h-4" />
                                      </button>
                                    </div>
                                  )}
                                  <span className="text-xs text-slate-500">
                                    {new Date(msg.timestamp).toLocaleTimeString('tr-TR', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Evaluation Form */}
                          {isEvaluating && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              className="ml-4 mt-3 bg-slate-800/50 border border-slate-700 rounded-xl p-4 space-y-3"
                            >
                              <p className="text-sm font-medium text-white">
                                Mesaj Değerlendirmesi
                              </p>

                              <div>
                                <label className="text-xs text-slate-400 mb-1 block">
                                  Kategori
                                </label>
                                <select
                                  value={messageCategory}
                                  onChange={(e) => setMessageCategory(e.target.value)}
                                  className="w-full bg-slate-900/50 border border-slate-600 rounded-lg p-2 text-sm text-white"
                                >
                                  {categories.map((cat) => (
                                    <option key={cat.value} value={cat.value}>
                                      {cat.label}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <label className="text-xs text-slate-400 mb-1 block">
                                  Neden bu değerlendirmeyi yaptınız?
                                </label>
                                <textarea
                                  value={messageComment}
                                  onChange={(e) => setMessageComment(e.target.value)}
                                  placeholder="Örn: Çok resmi bir dil kullanmış..."
                                  className="w-full bg-slate-900/50 border border-slate-600 rounded-lg p-2 text-sm text-white placeholder-slate-500 resize-none"
                                  rows={2}
                                />
                              </div>

                              <div>
                                <label className="text-xs text-slate-400 mb-1 block">
                                  İdeal cevap nasıl olmalıydı?{' '}
                                  <span className="text-red-400">*</span>
                                </label>
                                <textarea
                                  value={messageIdealResponse}
                                  onChange={(e) => setMessageIdealResponse(e.target.value)}
                                  placeholder="AI şu şekilde cevap vermeliydi..."
                                  className="w-full bg-slate-900/50 border border-slate-600 rounded-lg p-2 text-sm text-white placeholder-slate-500 resize-none"
                                  rows={3}
                                  autoFocus
                                />
                              </div>

                              <p className="text-xs text-slate-500">
                                💡 Bu değerlendirme AI Knowledge Base'e eklenecek
                              </p>

                              <div className="flex gap-2 pt-2 border-t border-slate-700">
                                <button
                                  onClick={cancelMessageEvaluation}
                                  className="px-3 py-2 text-sm text-slate-400 hover:text-white"
                                >
                                  İptal
                                </button>
                                <button
                                  onClick={() => submitMessageEvaluation(msg.id, 'neutral')}
                                  disabled={!messageIdealResponse.trim()}
                                  className="px-4 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/30 disabled:bg-slate-700 disabled:border-slate-600 text-yellow-400 disabled:text-slate-500 text-sm font-medium rounded-lg transition-colors flex items-center gap-1"
                                >
                                  <AlertTriangle className="w-4 h-4" />
                                  Geliştirilebilir
                                </button>
                                <button
                                  onClick={() => submitMessageEvaluation(msg.id, 'bad')}
                                  disabled={!messageIdealResponse.trim()}
                                  className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 disabled:bg-slate-700 disabled:border-slate-600 text-red-400 disabled:text-slate-500 text-sm font-medium rounded-lg transition-colors flex items-center gap-1"
                                >
                                  <ThumbsDown className="w-4 h-4" />
                                  Kötü
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

