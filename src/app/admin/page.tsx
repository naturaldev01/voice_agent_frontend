'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
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
  const [activeTab, setActiveTab] = useState<'overview' | 'patients' | 'conversations'>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [selectedConversation, setSelectedConversation] = useState<ConversationDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

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
    try {
      const res = await fetch(`${BACKEND_URL}/conversations/${conversationId}`);
      const data = await res.json();
      setSelectedConversation(data);
    } catch (error) {
      console.error('Error fetching conversation detail:', error);
    } finally {
      setLoadingDetail(false);
    }
  };

  const closeDetail = () => {
    setSelectedConversation(null);
  };

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
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
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
            icon={<Thermometer className="w-5 h-5" />}
            label="Warm Leads"
            value={stats.warmLeads}
            color="yellow"
          />
          <StatCard
            icon={<Snowflake className="w-5 h-5" />}
            label="Cold Leads"
            value={stats.coldLeads}
            color="cyan"
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {(['overview', 'patients', 'conversations'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg font-medium capitalize transition-colors ${
                activeTab === tab
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              {tab}
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
        ) : (
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
        )}
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
                    </div>

                    {/* Messages */}
                    <div className="md:col-span-2 flex flex-col max-h-[60vh]">
                      <div className="p-4 border-b border-slate-700">
                        <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider flex items-center gap-2">
                          <MessageSquare className="w-4 h-4" />
                          Transcript ({selectedConversation.conversation_messages?.length || 0} messages)
                        </h3>
                      </div>
                      
                      <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {selectedConversation.conversation_messages?.length ? (
                          selectedConversation.conversation_messages.map((msg) => (
                            <div
                              key={msg.id}
                              className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                            >
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
                                <p className="text-xs text-slate-500 mt-1">
                                  {new Date(msg.timestamp).toLocaleTimeString('tr-TR', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </p>
                              </div>
                            </div>
                          ))
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

