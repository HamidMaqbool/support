
import { useState, useEffect, useRef, FormEvent } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  Search, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  Inbox,
  Users,
  Settings,
  Menu,
  BarChart3,
  MessageSquare,
  ArrowUpRight,
  MoreVertical,
  LifeBuoy,
  X,
  UserPlus,
  Loader2,
  Star,
  MessageSquareQuote,
  Trash2,
  ShieldAlert,
  UserCheck,
  Plus,
  Send,
  Paperclip
} from 'lucide-react';
import { getSocket } from '../../lib/socket';
import { MOCK_USERS } from '../../constants';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '../../lib/AuthContext';
import { Ticket } from '../../types';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { logout, user: currentUser, token } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('inbox');
  const [adminSearch, setAdminSearch] = useState('');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [assigningId, setAssigningId] = useState<string | number | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [admins, setAdmins] = useState<any[]>([]);
  const [userPagination, setUserPagination] = useState<any>(null);
  const [userPage, setUserPage] = useState(1);
  const [feedbackData, setFeedbackData] = useState<any>(null);
  const [feedbackPage, setFeedbackPage] = useState(1);
  const [apps, setApps] = useState<any[]>([]);
  const [isNewTicketOpen, setIsNewTicketOpen] = useState(false);
  const [isNewAppOpen, setIsNewAppOpen] = useState(false);
  const [newAppName, setNewAppName] = useState('');
  const [newTicket, setNewTicket] = useState({ subject: '', category: 'Technical', message: '' });
  const [isInternal, setIsInternal] = useState(true);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const isManager = currentUser?.role === 'admin' && (currentUser as any)?.roles?.includes('manager');

  const playSound = () => {
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3');
    audio.play().catch(() => {});
  };

  useEffect(() => {
    const socket = getSocket();
    socket.on('new-ticket', (ticket: any) => {
      toast.info(`New ticket created: ${ticket.subject}`, {
        duration: Infinity,
        action: {
          label: 'View',
          onClick: () => navigate(`/admin/ticket/${ticket.id}`)
        }
      });
      playSound();
      fetchTickets();
    });

    const handleTicketStatusUpdate = ({ id: updatedId, status, rating }: any) => {
      setTickets(prev => prev.map(t => 
        t.id === parseInt(updatedId) || t.id === updatedId 
          ? { ...t, status, rating } 
          : t
      ));
    };

    const handleTicketUpdate = ({ id: updatedId, assignedTo }: any) => {
      setTickets(prev => prev.map(t => 
        t.id === parseInt(updatedId) || t.id === updatedId 
          ? { ...t, assignedTo } 
          : t
      ));
    };

    socket.on('ticket-status-updated', handleTicketStatusUpdate);
    socket.on('ticket-updated', handleTicketUpdate);

    return () => {
      socket.off('new-ticket');
      socket.off('ticket-status-updated', handleTicketStatusUpdate);
      socket.off('ticket-updated', handleTicketUpdate);
    };
  }, []);

  useEffect(() => {
    fetchTickets();
    if (activeTab === 'customers' || activeTab === 'staff' || activeTab === 'inbox') {
      fetchUsers(userPage);
    }
    if (activeTab === 'feedback') {
      fetchFeedbackStats(feedbackPage);
    }
    if (activeTab === 'apps') {
      fetchApps();
    }
  }, [token, activeTab, userPage, feedbackPage]);

  const fetchApps = async () => {
    try {
      const res = await fetch('/api/admin/apps', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setApps(await res.json());
      }
    } catch (err) {
      console.error('Fetch apps error:', err);
    }
  };

  const handleCreateApp = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/apps', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ name: newAppName })
      });
      if (res.ok) {
        const newApp = await res.json();
        setApps([newApp, ...apps]);
        setIsNewAppOpen(false);
        setNewAppName('');
        toast.success('Application created successfully!');
      }
    } catch (err) {
      console.error('Create app error:', err);
      toast.error('Failed to create application');
    }
  };

  const handleDeleteApp = async (appId: number) => {
    try {
      const res = await fetch(`/api/admin/apps/${appId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setApps(apps.filter(a => a.id !== appId));
        toast.success('Application deleted');
      }
    } catch (err) {
      console.error('Delete app error:', err);
    }
  };

  const fetchFeedbackStats = async (page = 1) => {
    try {
      const res = await fetch(`/api/admin/feedback-stats?page=${page}&limit=5`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setFeedbackData(await res.json());
      }
    } catch (err) {
      console.error('Fetch feedback stats error:', err);
    }
  };

  const fetchUsers = async (page = 1) => {
    try {
      const res = await fetch(`/api/admin/users?page=${page}&limit=100`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
        setAdmins(data.users.filter((u: any) => u.role === 'admin'));
        setUserPagination(data.pagination);
      }
    } catch (err) {
      console.error('Fetch users error:', err);
    }
  };

  const generateSecureLink = async (userId: string) => {
    try {
      const res = await fetch('/api/auth/secure-link', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ userId })
      });
      if (res.ok) {
        const { token: secureToken } = await res.json();
        const link = `${window.location.origin}/secure-login/${secureToken}`;
        navigator.clipboard.writeText(link);
        toast.success('Secure link copied to clipboard!');
      }
    } catch (err) {
      console.error('Secure link error:', err);
    }
  };

  const fetchTickets = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/tickets', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTickets(data);
      }
    } catch (err) {
      console.error('Fetch tickets error:', err);
      toast.error('Failed to load tickets');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssignTicket = async (ticketId: number | string, adminId: number | string) => {
    try {
      const res = await fetch(`/api/tickets/${ticketId}/assign`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ assignedTo: adminId })
      });

      if (res.ok) {
        const admin = admins.find(a => a.id === adminId);
        toast.success(`Ticket assigned to ${admin?.name || 'Agent'}`);
        setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, assignedTo: adminId } : t));
        setAssigningId(null);
      }
    } catch (err) {
      console.error('Assign error:', err);
      toast.error('Connection error');
    }
  };

  const [deletingId, setDeletingId] = useState<number | string | null>(null);

  const handleDeleteTicket = async (ticketId: number | string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/tickets/${ticketId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success(`Ticket #${ticketId} deleted`);
        setTickets(prev => prev.filter(t => t.id !== ticketId));
      } else {
        const data = await res.json();
        toast.error(data.message || 'Failed to delete ticket');
      }
    } catch (err) {
      console.error('Delete error:', err);
      toast.error('Connection error');
    } finally {
      setIsLoading(false);
      setDeletingId(null);
    }
  };

  const handleCreateTicket = async (e: FormEvent) => {
    e.preventDefault();
    setUploading(true);
    try {
      const uploadedAttachments = [];
      if (attachments.length > 0) {
        for (const file of attachments) {
          const formData = new FormData();
          formData.append('file', file);
          const uploadRes = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
          });
          if (uploadRes.ok) {
            const data = await uploadRes.json();
            uploadedAttachments.push({
              fileName: data.fileName,
              fileUrl: data.url,
              fileType: file.type,
              fileSize: file.size
            });
          }
        }
      }

      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({
          subject: newTicket.subject,
          description: newTicket.message,
          category: newTicket.category,
          priority: 'medium',
          attachments: uploadedAttachments,
          isInternal: isInternal
        })
      });

      if (res.ok) {
        const created = await res.json();
        setTickets([created, ...tickets]);
        toast.success('Internal ticket created successfully!');
        setIsNewTicketOpen(false);
        setNewTicket({ subject: '', category: 'Technical', message: '' });
        setAttachments([]);
      } else {
        const errorData = await res.json();
        toast.error(`Failed: ${errorData.message}`);
      }
    } catch (err) {
      console.error(err);
      toast.error('Something went wrong');
    } finally {
      setUploading(false);
    }
  };

  const agents = MOCK_USERS.filter(u => u.name.includes('Support') || [' Sarah', 'Alex'].some(n => u.name.includes(n)));

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-blue-500';
      default: return 'bg-slate-300';
    }
  };

  const filteredTickets = tickets.filter(t => 
    t.subject.toLowerCase().includes(adminSearch.toLowerCase()) || 
    t.id.toString().toLowerCase().includes(adminSearch.toLowerCase())
  );

  const stats = [
    { label: 'Unassigned', value: tickets.filter(t => !t.assignedTo).length.toString().padStart(2, '0'), icon: Inbox },
    { label: 'Critical', value: tickets.filter(t => t.priority === 'urgent').length.toString().padStart(2, '0'), icon: AlertCircle },
    { label: 'Pending Response', value: tickets.filter(t => t.status === 'pending').length.toString().padStart(2, '0'), icon: Clock },
    { label: 'Open Incidents', value: tickets.filter(t => t.status === 'open').length.toString().padStart(2, '0'), icon: MessageSquare }
  ];

  return (
    <div className="flex h-screen bg-[#F0F2F5] overflow-hidden">
      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: isSidebarOpen ? 280 : 80 }}
        className="bg-[#1C1D21] text-slate-400 flex flex-col z-50"
      >
        <div className="h-16 flex items-center px-6 border-b border-white/5 overflow-hidden whitespace-nowrap">
          <div className="flex items-center gap-3">
             <div className="bg-primary p-2 rounded-xl">
                <LifeBuoy className="w-5 h-5 text-white" />
             </div>
             {isSidebarOpen && (
               <span className="font-bold text-lg text-white tracking-tight">ZENITH<span className="font-light text-slate-400">ADMIN</span></span>
             )}
          </div>
        </div>

        <div className="flex-1 py-6 px-3 flex flex-col gap-1 overflow-hidden whitespace-nowrap">
          {[
            { id: 'inbox', label: 'Ticket Inbox', icon: Inbox },
            { id: 'apps', label: 'External Apps', icon: ArrowUpRight },
            { id: 'analytics', label: 'Support Metrics', icon: BarChart3 },
            { id: 'staff', label: 'Support Team', icon: ShieldAlert },
            { id: 'customers', label: 'Customers', icon: Users },
            { id: 'feedback', label: 'Feedback & Ratings', icon: Star },
            { id: 'settings', label: 'System Settings', icon: Settings },
          ].map((item) => (
            <button 
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-4 px-3 py-3 rounded-xl transition-all hover:bg-white/5 group relative ${activeTab === item.id ? 'bg-white/10 text-white' : ''}`}
            >
              <item.icon className={`w-5 h-5 ${activeTab === item.id ? 'text-primary' : ''}`} />
              {isSidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
            </button>
          ))}
        </div>

        <div className="p-4 border-t border-white/5 overflow-hidden whitespace-nowrap">
           <div className={`flex items-center gap-4 p-2 rounded-xl bg-white/5 border border-white/5 group`}>
              <Avatar className="w-8 h-8 rounded-lg">
                <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah" />
                <AvatarFallback>AM</AvatarFallback>
              </Avatar>
              {isSidebarOpen && (
                 <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-white truncate">{currentUser?.name || 'Sarah Admin'}</p>
                    <p className="text-[10px] opacity-40 truncate">
                      {(currentUser as any)?.roles?.join(' • ') || 'Lead Coordinator'}
                    </p>
                 </div>
              )}
              {isSidebarOpen && (
                <button onClick={logout} className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <X size={14} className="text-slate-500 hover:text-red-400" />
                </button>
              )}
           </div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between z-20">
          <div className="flex items-center gap-4">
             <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                <Menu size={20} />
             </Button>
             <div className="h-6 w-[1px] bg-slate-200 mx-2" />
             <div className="relative group">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" />
                <Input 
                  placeholder="Universal search..." 
                  value={adminSearch}
                  onChange={(e) => setAdminSearch(e.target.value)}
                  className="bg-slate-50 border-none w-64 h-9 pl-10 text-sm focus-visible:ring-1 focus-visible:ring-primary/20"
                />
             </div>
          </div>
          <div className="flex items-center gap-3">
             <Button 
               size="sm" 
               onClick={() => setIsNewTicketOpen(true)}
               className="rounded-lg h-9 bg-primary hover:bg-primary/90 text-white border-none gap-2"
             >
                <Plus size={16} /> New Ticket
             </Button>
             <Button variant="outline" size="sm" className="rounded-lg gap-2 text-xs font-semibold">
                <Clock size={14} /> Live Stream
             </Button>
             <Button size="sm" className="rounded-lg h-9 bg-slate-900 border-none hover:bg-slate-800" onClick={() => navigate('/')}>
                Exit Admin
             </Button>
          </div>
        </header>

        {/* View Content */}
        <main className="flex-1 overflow-auto p-8 relative">
           {isLoading && (
             <div className="absolute inset-0 flex items-center justify-center bg-[#F0F2F5]/50 z-10">
               <Loader2 className="w-10 h-10 text-primary animate-spin" />
             </div>
           )}
           <div className="max-w-6xl mx-auto">
              {activeTab === 'inbox' ? (
                <>
                  <header className="mb-8 flex items-end justify-between">
                     <div>
                        <h2 className="text-2xl font-bold text-slate-900 mb-1">Queue Management</h2>
                        <p className="text-slate-500 text-sm italic serif">Viewing {filteredTickets.length} active incidents across regional streams.</p>
                     </div>
                  </header>

                  <div className="grid grid-cols-4 gap-4 mb-8">
                     {stats.map((stat, i) => (
                       <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                          <div className="flex items-center justify-between mb-3 text-slate-400">
                             <stat.icon size={16} />
                          </div>
                          <p className="text-2xl font-bold text-slate-900 mono">{stat.value}</p>
                          <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mt-1">{stat.label}</p>
                       </div>
                     ))}
                  </div>

                  <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xl shadow-slate-200/50 min-h-[400px]">
                     <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                        <h3 className="font-bold text-slate-800 text-sm uppercase tracking-tight">Active Ticket Stream</h3>
                        <div className="flex items-center gap-2">
                           <Button variant="ghost" size="icon" onClick={fetchTickets} className="w-8 h-8 rounded-lg"><Clock size={16} /></Button>
                        </div>
                     </div>
                     <div className="divide-y divide-slate-100">
                        {filteredTickets.map((ticket, i) => (
                          <motion.div 
                            key={ticket.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="group flex items-center px-6 py-5 hover:bg-slate-50 transition-all cursor-pointer border-l-4 border-transparent hover:border-primary"
                          >
                             <div className="flex items-center gap-4 flex-1 min-w-0" onClick={() => navigate(`/admin/ticket/${ticket.id}`)}>
                                <div className="relative">
                                   <Avatar className="w-12 h-12 rounded-2xl border-2 border-white shadow-sm">
                                      <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${ticket.userId}`} />
                                      <AvatarFallback>U</AvatarFallback>
                                   </Avatar>
                                   <div className={`absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white ${getPriorityColor(ticket.priority)} shadow-sm`} title={ticket.priority} />
                                </div>
                                <div className="flex-1 min-w-0">
                                   <div className="flex items-center gap-2 mb-1">
                                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">#{ticket.id}</span>
                                      <span className="text-[10px] font-bold text-slate-400">•</span>
                                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{ticket.category}</span>
                                      {ticket.isInternal && (
                                        <Badge className="bg-amber-100 text-amber-700 border-none text-[8px] font-black uppercase tracking-tighter h-4 px-1.5 flex items-center gap-1">
                                          <ShieldAlert size={8} /> Internal
                                        </Badge>
                                      )}
                                   </div>
                                   <h4 className="font-bold text-slate-900 group-hover:text-primary transition-colors truncate">{ticket.subject}</h4>
                                   <p className="text-xs text-slate-500 truncate mt-0.5">{ticket.description}</p>
                                </div>
                             </div>
                             <div className="flex items-center gap-8 pl-8 text-right shrink-0">
                                <div className="hidden lg:flex flex-col items-end gap-1 relative">
                                   <p className="text-[10px] font-bold text-slate-400 uppercase">Assigned To</p>
                                   <button 
                                     onClick={(e) => {
                                        e.stopPropagation();
                                        setAssigningId(assigningId === ticket.id ? null : ticket.id);
                                      }}
                                     className="flex items-center gap-2 px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200"
                                   >
                                      <span className="text-xs font-bold text-slate-700">
                                        {admins.find(a => a.id === ticket.assignedTo)?.name || 'Unassigned'}
                                      </span>
                                      <UserPlus size={12} className="text-slate-400" />
                                   </button>
                                   
                                   {assigningId === ticket.id && (
                                     <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 overflow-hidden text-left" onClick={(e) => e.stopPropagation()}>
                                        <div className="p-2 border-b border-slate-100 bg-slate-50 text-[10px] font-bold text-slate-400 uppercase">Select Agent</div>
                                        <button 
                                          onClick={() => handleAssignTicket(ticket.id, currentUser?.id!)}
                                          className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 transition-colors border-b border-slate-50"
                                        >
                                          <Avatar className="w-6 h-6 rounded-lg">
                                             <AvatarImage src={currentUser?.avatar} />
                                             <AvatarFallback>ME</AvatarFallback>
                                          </Avatar>
                                          <div className="flex flex-col text-left">
                                             <span className="text-xs font-bold text-primary">Assign to me</span>
                                             <span className="text-[9px] text-slate-400 font-bold uppercase">{(currentUser as any)?.roles?.join(' • ') || 'Agent'}</span>
                                          </div>
                                        </button>
                                        {admins.filter(a => a.id !== currentUser?.id).map(agent => (
                                          <button 
                                            key={agent.id}
                                            onClick={() => handleAssignTicket(ticket.id, agent.id)}
                                            className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0"
                                          >
                                            <Avatar className="w-6 h-6 rounded-lg">
                                               <AvatarImage src={agent.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${agent.id}`} />
                                               <AvatarFallback>{agent.name[0]}</AvatarFallback>
                                            </Avatar>
                                            <div className="flex flex-col text-left">
                                               <span className="text-xs font-bold text-slate-700">{agent.name}</span>
                                               <span className="text-[9px] text-slate-400 font-bold uppercase">{agent.roles?.join(' • ') || 'Agent'}</span>
                                            </div>
                                          </button>
                                        ))}
                                     </div>
                                   )}
                                </div>
                                <div onClick={() => navigate(`/admin/ticket/${ticket.id}`)}>
                                   <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Status</p>
                                   <div className={`text-[10px] font-bold px-2 py-0.5 rounded-md border uppercase tracking-wider whitespace-nowrap ${
                                     ticket.status === 'open' ? 'bg-blue-50 text-blue-600 border-blue-100' : 
                                     ticket.status === 'pending' ? 'bg-yellow-50 text-yellow-600 border-yellow-100' :
                                     (ticket.status === 'resolved' && (ticket as any).rating === null) ? 'bg-orange-50 text-orange-600 border-orange-100' :
                                     'bg-green-50 text-green-600 border-green-100'
                                   }`}>
                                     {ticket.status === 'resolved' && (ticket as any).rating === null ? 'feedback pending' : ticket.status}
                                   </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div 
                                    className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-50 text-slate-300 group-hover:bg-primary group-hover:text-white transition-all"
                                    onClick={() => navigate(`/admin/ticket/${ticket.id}`)}
                                  >
                                     <ArrowUpRight size={18} />
                                  </div>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="w-10 h-10 rounded-xl text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDeletingId(ticket.id);
                                    }}
                                  >
                                     <Trash2 size={18} />
                                  </Button>

                                  <Dialog open={deletingId === ticket.id} onOpenChange={(open) => !open && setDeletingId(null)}>
                                    <DialogContent className="bg-white border-0 shadow-2xl rounded-[32px] sm:max-w-[400px] text-center p-8 overflow-hidden">
                                       <div className="bg-red-500 h-1.5 w-full absolute top-0 left-0" />
                                       <div className="w-20 h-20 bg-red-50 text-red-500 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-inner mt-4">
                                          <Trash2 size={40} className="animate-pulse" />
                                       </div>
                                       <DialogTitle className="text-2xl font-black text-slate-900 mb-2 tracking-tight text-center">Delete Ticket?</DialogTitle>
                                       <DialogDescription className="text-slate-500 mb-8 font-medium leading-relaxed text-center">
                                         Permanently delete ticket <span className="text-slate-900 font-bold bg-slate-100 px-1.5 py-0.5 rounded">#{ticket.id}</span>? 
                                         This will remove all associated history and assets.
                                       </DialogDescription>
                                       <div className="flex flex-col sm:flex-row gap-3">
                                         <Button variant="ghost" onClick={() => setDeletingId(null)} className="flex-1 rounded-2xl h-14 font-bold text-slate-400">
                                           Cancel
                                         </Button>
                                         <Button 
                                           onClick={() => handleDeleteTicket(ticket.id)} 
                                           className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-2xl h-14 font-black shadow-lg shadow-red-200"
                                         >
                                           Delete
                                         </Button>
                                       </div>
                                    </DialogContent>
                                  </Dialog>
                                </div>
                             </div>
                          </motion.div>
                        ))}
                     </div>
                  </div>
                </>
              ) : activeTab === 'staff' ? (
                <>
                  <header className="mb-8">
                    <h2 className="text-2xl font-bold text-slate-900 mb-1">Support Team</h2>
                    <p className="text-slate-500 text-sm italic serif">Directory of internal specialists and their assigned roles.</p>
                  </header>
                  
                  <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xl shadow-slate-200/50">
                    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                       <h3 className="font-bold text-slate-800 text-sm uppercase tracking-tight">Staff Registry</h3>
                    </div>
                    <div className="divide-y divide-slate-100">
                       {admins.map((staff) => (
                         <div key={staff.id} className="flex items-center px-6 py-5 hover:bg-slate-50 transition-colors">
                            <Avatar className="w-12 h-12 rounded-2xl mr-4 border-2 border-white shadow-sm">
                               <AvatarImage src={staff.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${staff.id}`} />
                               <AvatarFallback className="bg-slate-100 text-slate-500 font-bold">{staff.name[0]}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                               <div className="flex items-center gap-2">
                                  <p className="font-black text-slate-900 text-sm">{staff.name}</p>
                                  {staff.id === currentUser?.id && <Badge className="bg-primary/10 text-primary border-none text-[8px] font-black uppercase">You</Badge>}
                                  {staff.appName && (
                                    <Badge variant="outline" className="bg-slate-50 text-[8px] font-bold text-slate-400 border-slate-100">
                                      {staff.appName}
                                    </Badge>
                                  )}
                               </div>
                               <p className="text-xs text-slate-500 font-medium">{staff.email}</p>
                            </div>
                            <div className="flex items-center gap-2">
                               {staff.roles?.map((role: string) => (
                                 <Badge key={role} variant="outline" className="uppercase text-[9px] font-black tracking-widest bg-slate-100 text-slate-500 border-none px-2 py-1">
                                    {role}
                                 </Badge>
                               ))}
                               {!staff.roles?.length && <Badge variant="outline" className="uppercase text-[9px] font-black tracking-widest bg-slate-50 text-slate-300 border-none px-2 py-1">Agent</Badge>}
                            </div>
                         </div>
                       ))}
                    </div>
                  </div>
                </>
              ) : activeTab === 'customers' ? (
                <>
                  <header className="mb-8">
                    <h2 className="text-2xl font-bold text-slate-900 mb-1">Customer Directory</h2>
                    <p className="text-slate-500 text-sm">Review registered client base and service access levels.</p>
                  </header>
                  
                  <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xl shadow-slate-200/50">
                    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                       <h3 className="font-bold text-slate-800 text-sm uppercase tracking-tight">Clients</h3>
                    </div>
                    <div className="divide-y divide-slate-100">
                       {users.filter((u: any) => u.role === 'user').map((user) => (
                         <div key={user.id} className="flex items-center px-6 py-4 hover:bg-slate-50 transition-colors">
                            <Avatar className="w-10 h-10 rounded-xl mr-4 border border-slate-200">
                               <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`} />
                               <AvatarFallback className="bg-slate-100 text-slate-500 font-bold">{user.name[0]}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                               <div className="flex items-center gap-2">
                                 <p className="font-bold text-slate-900 text-sm">{user.name}</p>
                                 {user.appName && (
                                   <Badge variant="outline" className="bg-primary/5 text-primary border-primary/10 text-[8px] font-bold">
                                     {user.appName}
                                   </Badge>
                                 )}
                               </div>
                               <p className="text-xs text-slate-500">{user.email}</p>
                            </div>
                            <div className="flex items-center gap-3">
                               <Badge variant="outline" className="uppercase text-[9px] font-bold tracking-widest bg-green-50 text-green-600 border-none px-2 py-1">Standard</Badge>
                               <Button 
                                 variant="outline" 
                                 size="sm" 
                                 className="h-8 text-[10px] font-bold rounded-lg gap-2 border-slate-200 hover:bg-primary/5 hover:text-primary transition-all"
                                 onClick={() => generateSecureLink(user.id)}
                               >
                                 Secure Link
                               </Button>
                            </div>
                         </div>
                       ))}
                       {users.filter((u: any) => u.role === 'user').length === 0 && (
                         <div className="p-12 text-center text-slate-400">
                            <Users size={32} className="mx-auto mb-3 opacity-20" />
                            <p className="text-xs font-bold uppercase tracking-widest">No customers found</p>
                         </div>
                       )}
                    </div>
                    {userPagination && userPagination.totalPages > 1 && (
                      <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                         <p className="text-xs text-slate-500">
                           Showing page <span className="font-bold text-slate-900">{userPage}</span> of <span className="font-bold text-slate-900">{userPagination.totalPages}</span>
                         </p>
                         <div className="flex gap-2">
                           <Button 
                             variant="outline" 
                             size="sm" 
                             disabled={userPage === 1}
                             onClick={() => setUserPage(prev => prev - 1)}
                             className="h-8 rounded-lg text-xs"
                           >
                             Previous
                           </Button>
                           <Button 
                             variant="outline" 
                             size="sm" 
                             disabled={userPage === userPagination.totalPages}
                             onClick={() => setUserPage(prev => prev + 1)}
                             className="h-8 rounded-lg text-xs"
                           >
                             Next
                           </Button>
                         </div>
                      </div>
                    )}
                  </div>
                </>
              ) : activeTab === 'apps' ? (
                <>
                  <header className="mb-8 flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900 mb-1">External Applications</h2>
                      <p className="text-slate-500 text-sm">Manage API integrations and secure access tokens for external platforms.</p>
                    </div>
                    <Button 
                      onClick={() => setIsNewAppOpen(true)}
                      className="rounded-xl bg-primary text-white hover:bg-primary/90 h-10 px-6 gap-2"
                    >
                      <Plus size={18} /> Register App
                    </Button>
                  </header>

                  <div className="grid grid-cols-1 gap-6">
                    {apps.map((app) => (
                      <div key={app.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group">
                        <div className="flex items-start justify-between relative z-10">
                          <div className="flex gap-4">
                            <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-all">
                              <ArrowUpRight size={24} />
                            </div>
                            <div>
                              <h3 className="text-lg font-bold text-slate-900 mb-1">{app.name}</h3>
                              <div className="flex items-center gap-4 text-xs text-slate-500 font-medium">
                                <span className="flex items-center gap-1.5">
                                  <Users size={14} /> {app.userCount || 0} users Associated
                                </span>
                                <span className="flex items-center gap-1.5">
                                  <Clock size={14} /> Created {app.createdAt ? format(new Date(app.createdAt), 'MMM d, yyyy') : 'Recently'}
                                </span>
                              </div>
                            </div>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-slate-300 hover:text-red-500 hover:bg-red-50"
                            onClick={() => handleDeleteApp(app.id)}
                          >
                            <Trash2 size={18} />
                          </Button>
                        </div>

                        <div className="mt-6 p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                          <div className="flex-1">
                            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Application Token (Secret)</p>
                            <code className="text-xs font-mono font-bold text-slate-700 bg-white px-2 py-1 rounded border border-slate-200 block truncate">
                              {app.token}
                            </code>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="ml-4 text-[10px] font-bold h-8 text-primary hover:bg-primary/5"
                            onClick={() => {
                              navigator.clipboard.writeText(app.token);
                              toast.success('Token copied to clipboard!');
                            }}
                          >
                            Copy Token
                          </Button>
                        </div>
                      </div>
                    ))}
                    
                    {apps.length === 0 && (
                      <div className="p-20 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200">
                        <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-300 mx-auto mb-4">
                          <ArrowUpRight size={32} />
                        </div>
                        <h4 className="text-slate-900 font-bold mb-1">No applications registered</h4>
                        <p className="text-slate-500 text-sm mb-6 max-w-sm mx-auto">Register your first application to start using external authentication and automated user onboarding.</p>
                        <Button onClick={() => setIsNewAppOpen(true)} variant="outline" className="rounded-xl px-6">Create Secret Token</Button>
                      </div>
                    )}
                  </div>

                  <Dialog open={isNewAppOpen} onOpenChange={setIsNewAppOpen}>
                    <DialogContent className="sm:max-w-md bg-white border-0 shadow-2xl rounded-[32px]">
                      <DialogHeader>
                        <DialogTitle className="text-2xl font-bold">Register Application</DialogTitle>
                        <DialogDescription className="text-slate-500">
                          Create a new application identity. This will generate a secret token for API authentication.
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleCreateApp} className="space-y-6 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="appName" className="text-xs font-bold uppercase tracking-wider text-slate-400">Application Name</Label>
                          <Input 
                            id="appName" 
                            placeholder="e.g., Nexus CRM, Billing Portal..." 
                            required 
                            className="h-12 rounded-xl bg-slate-50 border-0 focus-visible:ring-2 focus-visible:ring-primary/20"
                            value={newAppName}
                            onChange={(e) => setNewAppName(e.target.value)}
                          />
                        </div>
                        <DialogFooter>
                          <Button type="button" variant="ghost" onClick={() => setIsNewAppOpen(false)} className="rounded-xl h-12">Cancel</Button>
                          <Button type="submit" className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl px-8 h-12">
                            Create App
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </>
              ) : activeTab === 'feedback' ? (
                <>
                  <header className="mb-8">
                    <h2 className="text-2xl font-bold text-slate-900 mb-1">Service Feedback</h2>
                    <p className="text-slate-500 text-sm">Customer satisfaction metrics and latest reviews.</p>
                  </header>
                  
                  {feedbackData && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                         <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Satisfactory Score</p>
                            <div className="flex items-center gap-3">
                               <p className="text-3xl font-black text-slate-900">{Number(feedbackData.stats.averageRating || 0).toFixed(1)}</p>
                               <div className="flex gap-0.5 text-yellow-400">
                                  {[1, 2, 3, 4, 5].map(s => (
                                    <Star key={s} size={14} fill={feedbackData.stats.averageRating >= s ? 'currentColor' : 'none'} />
                                  ))}
                               </div>
                            </div>
                         </div>
                         <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total Reviews</p>
                            <p className="text-3xl font-black text-slate-900">{feedbackData.stats.totalRatings}</p>
                         </div>
                         <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Completion Rate</p>
                            <p className="text-3xl font-black text-slate-900">
                               {feedbackData.stats.totalTickets ? Math.round((feedbackData.stats.totalRatings / feedbackData.stats.totalTickets) * 100) : 0}%
                            </p>
                         </div>
                      </div>

                      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xl shadow-slate-200/50">
                        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                           <h3 className="font-bold text-slate-800 text-sm uppercase tracking-tight">Recent Feedback</h3>
                        </div>
                        <div className="divide-y divide-slate-100">
                           {feedbackData.latestFeedback.map((fb: any) => (
                             <div 
                               key={fb.id} 
                               className="p-6 hover:bg-slate-50 transition-colors cursor-pointer group/item"
                               onClick={() => navigate(`/admin/ticket/${fb.id}`)}
                             >
                                <div className="flex items-start justify-between mb-3">
                                   <div className="flex items-center gap-3">
                                      <Avatar className="w-8 h-8 rounded-lg shrink-0 border border-slate-200">
                                         <AvatarFallback className="bg-slate-100 text-slate-500 text-[10px] font-bold">{fb.userName[0]}</AvatarFallback>
                                      </Avatar>
                                      <div>
                                         <p className="text-sm font-bold text-slate-900 group-hover/item:text-primary transition-colors">{fb.userName}</p>
                                         <p className="text-[10px] text-slate-500 font-medium truncate max-w-[200px]">Re: {fb.subject}</p>
                                      </div>
                                   </div>
                                   <div className="flex gap-0.5 text-yellow-400">
                                      {[1, 2, 3, 4, 5].map(s => (
                                        <Star key={s} size={12} fill={fb.rating >= s ? 'currentColor' : 'none'} />
                                      ))}
                                   </div>
                                </div>
                                <div className="bg-slate-100/50 p-4 rounded-2xl relative border border-slate-100/50">
                                   <div className="absolute -top-1 -left-1 text-primary/10">
                                      <MessageSquareQuote size={48} className="rotate-12" />
                                   </div>
                                   <p className="text-xs text-slate-600 leading-relaxed font-medium relative z-10 italic pl-2">
                                      "{fb.feedback || 'The customer didn\'t leave a comment.'}"
                                   </p>
                                </div>
                             </div>
                           ))}
                           {feedbackData.latestFeedback.length === 0 && (
                             <div className="p-12 text-center text-slate-400">
                                <Star size={32} className="mx-auto mb-3 opacity-20" />
                                <p className="text-xs font-bold uppercase tracking-widest">No feedback received yet</p>
                             </div>
                           )}
                        </div>
                        {feedbackData.pagination && feedbackData.pagination.totalPages > 1 && (
                          <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                            <p className="text-xs text-slate-500">
                              Showing page <span className="font-bold text-slate-900">{feedbackPage}</span> of <span className="font-bold text-slate-900">{feedbackData.pagination.totalPages}</span>
                            </p>
                            <div className="flex gap-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                disabled={feedbackPage === 1}
                                onClick={() => setFeedbackPage(prev => prev - 1)}
                                className="h-8 rounded-lg text-xs"
                              >
                                Previous
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                disabled={feedbackPage === feedbackData.pagination.totalPages}
                                onClick={() => setFeedbackPage(prev => prev + 1)}
                                className="h-8 rounded-lg text-xs"
                              >
                                Next
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="h-[400px] flex flex-col items-center justify-center text-slate-400 bg-white rounded-3xl border border-slate-200 border-dashed">
                  <h3 className="text-lg font-bold text-slate-600 mb-2">{activeTab.toUpperCase()} Module</h3>
                  <p className="text-sm">This module is currently in development.</p>
                  <Button variant="outline" className="mt-4 rounded-xl" onClick={() => setActiveTab('inbox')}>Back to Inbox</Button>
                </div>
              )}
           </div>
            <Dialog open={isNewTicketOpen} onOpenChange={setIsNewTicketOpen}>
              <DialogContent className="sm:max-w-md bg-white border-0 shadow-2xl rounded-[32px]">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-bold">Create Internal Ticket</DialogTitle>
                  <DialogDescription className="text-slate-500">
                    Internal tickets are only visible to support specialists and managers.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateTicket} className="space-y-6 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="subject" className="text-xs font-bold uppercase tracking-wider text-slate-400">Subject</Label>
                    <Input 
                      id="subject" 
                      placeholder="e.g., Internal server maintenance" 
                      required 
                      className="h-12 rounded-xl bg-slate-50 border-0 focus-visible:ring-2 focus-visible:ring-primary/20"
                      value={newTicket.subject}
                      onChange={(e) => setNewTicket({...newTicket, subject: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category" className="text-xs font-bold uppercase tracking-wider text-slate-400">Category</Label>
                    <select 
                      id="category"
                      className="w-full h-12 rounded-xl bg-slate-50 border-0 px-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                      value={newTicket.category}
                      onChange={(e) => setNewTicket({...newTicket, category: e.target.value})}
                    >
                      <option>Technical</option>
                      <option>Billing</option>
                      <option>Account</option>
                      <option>Feature Request</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="message" className="text-xs font-bold uppercase tracking-wider text-slate-400">Notes / Details</Label>
                    <Textarea 
                      id="message" 
                      placeholder="Provide internal context..." 
                      required 
                      className="min-h-[120px] rounded-xl bg-slate-50 border-0 focus-visible:ring-2 focus-visible:ring-primary/20 resize-none"
                      value={newTicket.message}
                      onChange={(e) => setNewTicket({...newTicket, message: e.target.value})}
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">Attachments</Label>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => fileInputRef.current?.click()}
                        className="text-xs rounded-lg h-7 font-bold text-primary hover:bg-primary/5"
                      >
                        <Plus size={12} className="mr-1" /> Add Files
                      </Button>
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        multiple 
                        onChange={(e) => {
                          if (e.target.files) {
                            setAttachments([...attachments, ...Array.from(e.target.files)]);
                          }
                        }} 
                      />
                    </div>
                    
                    {attachments.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                         {attachments.map((file, idx) => (
                           <div key={idx} className="bg-slate-50 text-slate-600 px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-2 border border-slate-100 group">
                              <span className="max-w-[150px] truncate">{file.name}</span>
                              <button 
                                type="button"
                                onClick={() => setAttachments(attachments.filter((_, i) => i !== idx))} 
                                className="text-slate-400 hover:text-red-500 transition-colors"
                              >
                                <X size={12} />
                              </button>
                           </div>
                         ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between p-4 bg-amber-50/50 rounded-2xl border border-amber-100/50">
                    <div className="flex items-center gap-3">
                       <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
                          <ShieldAlert size={16} />
                       </div>
                       <div>
                          <p className="text-sm font-bold text-slate-900">Internal Ticket</p>
                          <p className="text-[10px] text-slate-500">Visible only to admins</p>
                       </div>
                    </div>
                    <button 
                      type="button"
                      onClick={() => setIsInternal(!isInternal)}
                      className={`w-10 h-5 rounded-full transition-all relative ${isInternal ? 'bg-amber-500' : 'bg-slate-200'}`}
                    >
                      <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${isInternal ? 'right-1' : 'left-1'}`} />
                    </button>
                  </div>

                  <DialogFooter className="sm:justify-end gap-2">
                    <Button type="button" variant="ghost" onClick={() => {
                      setIsNewTicketOpen(false);
                      setAttachments([]);
                    }} className="rounded-xl">Cancel</Button>
                    <Button type="submit" disabled={uploading} className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl px-6 gap-2">
                      {uploading ? <Loader2 size={16} className="animate-spin" /> : <>Create Ticket <Send size={16} /></>}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
        </main>
      </div>
    </div>
  );
}
