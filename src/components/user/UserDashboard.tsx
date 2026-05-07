
import { useState, useEffect, useRef, FormEvent } from 'react';
import { motion } from 'motion/react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  Plus, 
  Search, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Filter,
  LifeBuoy,
  ArrowLeft,
  ChevronRight,
  Send,
  X,
  Loader2,
  LogOut
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useAuth } from '../../lib/AuthContext';
import { getSocket } from '../../lib/socket';
import { Ticket } from '../../types';

export default function UserDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user: authUser, token, logout } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isNewTicketOpen, setIsNewTicketOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [admins, setAdmins] = useState<any[]>([]);
  const [newTicket, setNewTicket] = useState({ subject: '', category: 'Technical', message: '' });
  const [profileData, setProfileData] = useState({ name: '', avatar: '' });
  const [attachments, setAttachments] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const socket = getSocket();
    
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
      socket.off('ticket-status-updated', handleTicketStatusUpdate);
      socket.off('ticket-updated', handleTicketUpdate);
    };
  }, []);

  useEffect(() => {
    if (location.state?.openNewTicket) {
      setIsNewTicketOpen(true);
      // Clean up state
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate, location.pathname]);

  useEffect(() => {
    fetchProfile();
    fetchTickets();
  }, [token]);

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUserProfile(data);
        setProfileData({ 
          name: data.name || '', 
          avatar: data.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.id}` 
        });
      }
    } catch (err) {
      console.error('Fetch profile error:', err);
    }
  };

  const handleUpdateProfile = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/me', {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(profileData)
      });
      if (res.ok) {
        toast.success('Profile updated successfully');
        setIsProfileOpen(false);
        fetchProfile();
      }
    } catch (err) {
      console.error('Update profile error:', err);
      toast.error('Failed to update profile');
    }
  };

  const fetchAdmins = async () => {
    try {
      const res = await fetch('/api/admin/users?limit=100', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAdmins(data.users.filter((u: any) => u.role === 'admin'));
      }
    } catch (err) {
      console.error('Failed to fetch admins:', err);
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
      console.error('Failed to fetch tickets:', err);
      toast.error('Failed to load tickets');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusInfo = (ticket: Ticket) => {
    const isFeedbackPending = ticket.status === 'resolved' && ticket.rating === null;
    const status = isFeedbackPending ? 'feedback pending' : ticket.status;

    switch (status) {
      case 'open': return { label: 'Open', color: 'bg-blue-100 text-blue-700 border-blue-200' };
      case 'pending': return { label: 'Pending', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' };
      case 'resolved': return { label: 'Resolved', color: 'bg-green-100 text-green-700 border-green-200' };
      case 'feedback pending': return { label: 'Feedback Pending', color: 'bg-orange-100 text-orange-700 border-orange-200' };
      case 'closed': return { label: 'Closed', color: 'bg-slate-100 text-slate-700 border-slate-200' };
      default: return { label: status, color: 'bg-slate-100 text-slate-700' };
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent': return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'high': return <AlertCircle className="w-4 h-4 text-orange-500" />;
      default: return null;
    }
  };

  const handleCreateTicket = async (e: FormEvent) => {
    e.preventDefault();
    setUploading(true);
    try {
      // 1. Upload attachments first if any
      const uploadedAttachments = [];
      if (attachments.length > 0) {
        for (const file of attachments) {
          const formData = new FormData();
          formData.append('file', file);
          // We don't have a ticketId yet, so we'll link it after creation or 
          // the server will handle it if we send the URLs.
          // Since our /api/upload requires a ticketId optionally, we can call it without it.
          
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

      // 2. Create the ticket with attachment info
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
          isInternal: false // Default to false for user dashboard
        })
      });

      if (res.ok) {
        const created = await res.json();
        setTickets([created, ...tickets]);
        toast.success('Support ticket created successfully!');
        setIsNewTicketOpen(false);
        setNewTicket({ subject: '', category: 'Technical', message: '' });
        setAttachments([]);
      } else {
        const errorData = await res.json();
        toast.error(`Failed to create ticket: ${errorData.message || 'Unknown error'}`);
        if (errorData.error) console.error('Ticket creation error details:', errorData.error);
      }
    } catch (err) {
      console.error('Create ticket error:', err);
      toast.error('Something went wrong');
    } finally {
      setUploading(false);
    }
  };

  const filteredTickets = tickets.filter(t => 
    t.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.id.toString().includes(searchTerm.toLowerCase())
  );

  const activeCount = tickets.filter(t => t.status === 'open' || t.status === 'pending').length;
  const resolvedCount = tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length;
  const pendingCount = tickets.filter(t => t.status === 'pending').length;

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="border-b border-slate-100 px-6 h-16 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-md z-30">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
             <ArrowLeft className="w-4 h-4 text-slate-400" />
             <div className="bg-primary/10 p-1.5 rounded-lg">
                <LifeBuoy className="w-5 h-5 text-primary" />
             </div>
             <span className="font-bold tracking-tight text-slate-900">Zenith<span className="font-light text-slate-500">Desk</span></span>
          </div>
          <div className="h-4 w-[1px] bg-slate-200" />
          <span className="text-sm font-medium text-slate-600">Customer Support Area</span>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" className="text-slate-500 hover:text-slate-900 hidden sm:flex">Documentation</Button>
          <DropdownMenu>
            <DropdownMenuTrigger render={
              <Avatar className="w-8 h-8 cursor-pointer hover:ring-2 hover:ring-primary/20 transition-all border border-slate-200">
                <AvatarImage src={userProfile?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${authUser?.id}`} />
                <AvatarFallback className="bg-slate-100 text-slate-500 text-[10px] font-bold">
                  {userProfile?.name?.[0] || authUser?.name?.[0] || 'U'}
                </AvatarFallback>
              </Avatar>
            } />
            <DropdownMenuContent align="end" className="w-56 mt-2 rounded-xl bg-white shadow-xl border-slate-100">
              <div className="p-3 border-b border-slate-100 mb-1">
                <p className="text-sm font-bold text-slate-900">{userProfile?.name || authUser?.name}</p>
                <p className="text-xs text-slate-500 truncate">{authUser?.email}</p>
                {userProfile?.appName && (
                  <Badge variant="outline" className="mt-1 text-[8px] font-bold uppercase bg-primary/5 text-primary border-primary/10">
                    Via {userProfile.appName}
                  </Badge>
                )}
              </div>
              <DropdownMenuItem onClick={() => setIsProfileOpen(true)} className="rounded-lg h-9 gap-2">
                My Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/portal')} className="rounded-lg h-9 gap-2">
                User Portal
              </DropdownMenuItem>
              <DropdownMenuItem onClick={logout} className="text-red-600 hover:bg-red-50 rounded-lg h-9 gap-2">
                <LogOut size={14} /> Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">My Requests</h1>
            <div className="flex items-center gap-3">
              <p className="text-slate-500 text-sm">Track your support tickets and get updates in real-time.</p>
              {userProfile?.appName && (
                <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 rounded-full border border-slate-200">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tight">Connected via {userProfile.appName}</span>
                </div>
              )}
            </div>
          </div>
          
        {/* Profile Dialog */}
        <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
          <DialogContent className="sm:max-w-md bg-white border-0 shadow-2xl rounded-[32px]">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">Manage Profile</DialogTitle>
              <DialogDescription className="text-slate-500">
                Update your personal information and profile picture.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUpdateProfile} className="space-y-6 py-4">
              <div className="flex flex-col items-center gap-4 mb-6">
                <Avatar className="w-24 h-24 border-4 border-slate-50 shadow-xl">
                  <AvatarImage src={profileData.avatar} />
                  <AvatarFallback className="text-2xl bg-slate-100 font-bold">{profileData.name?.[0]}</AvatarFallback>
                </Avatar>
                <div className="space-y-1 text-center">
                  <p className="text-xs font-bold uppercase text-slate-400">Profile Image URL</p>
                  <Input 
                    value={profileData.avatar} 
                    onChange={(e) => setProfileData({...profileData, avatar: e.target.value})}
                    placeholder="https://example.com/image.jpg"
                    className="h-10 text-xs rounded-xl bg-slate-50 border-0 text-center w-64"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">Full Name</Label>
                  <Input 
                    required 
                    className="h-12 rounded-xl bg-slate-50 border-0 focus-visible:ring-2 focus-visible:ring-primary/20"
                    value={profileData.name}
                    onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">Email Address (Read-only)</Label>
                  <Input 
                    disabled
                    className="h-12 rounded-xl bg-slate-50 border-0 text-slate-400 cursor-not-allowed"
                    value={authUser?.email || ''}
                  />
                </div>
                {userProfile?.appName && (
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Associated Application</p>
                    <p className="text-sm font-bold text-slate-700">{userProfile.appName}</p>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setIsProfileOpen(false)} className="rounded-xl h-12">Cancel</Button>
                <Button type="submit" className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl px-8 h-12">
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={isNewTicketOpen} onOpenChange={setIsNewTicketOpen}>
            <DialogTrigger 
              render={
                <Button className="h-12 px-6 rounded-xl bg-slate-900 hover:bg-slate-800 gap-2 items-center shadow-lg shadow-slate-900/10">
                  <Plus size={18} /> New Support Ticket
                </Button>
              }
            />
            <DialogContent className="sm:max-w-md bg-white border-0 shadow-2xl rounded-[32px]">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold">Open New Ticket</DialogTitle>
                <DialogDescription className="text-slate-500">
                  Fill in the details below to reach out to our support specialists.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateTicket} className="space-y-6 py-4">
                <div className="space-y-2">
                  <Label htmlFor="subject" className="text-xs font-bold uppercase tracking-wider text-slate-400">Subject</Label>
                  <Input 
                    id="subject" 
                    placeholder="e.g., Issue with subscription plan" 
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
                  <Label htmlFor="message" className="text-xs font-bold uppercase tracking-wider text-slate-400">Message</Label>
                  <Textarea 
                    id="message" 
                    placeholder="Provide details about your request..." 
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

                <DialogFooter className="sm:justify-end gap-2">
                  <Button type="button" variant="ghost" onClick={() => {
                    setIsNewTicketOpen(false);
                    setAttachments([]);
                  }} className="rounded-xl">Cancel</Button>
                  <Button type="submit" disabled={uploading} className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl px-6 gap-2">
                    {uploading ? <Loader2 size={16} className="animate-spin" /> : <>Submit Ticket <Send size={16} /></>}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          {[
            { label: 'Active Tickets', value: activeCount, icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Feedback Pending', value: tickets.filter(t => t.status === 'resolved' && t.rating === null).length, icon: AlertCircle, color: 'text-orange-600', bg: 'bg-orange-50' },
            { label: 'Completed', value: tickets.filter(t => t.status === 'closed' || (t.status === 'resolved' && t.rating !== null)).length, icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' }
          ].map((stat, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="p-6 rounded-2xl border border-slate-100 bg-slate-50/50 flex items-center justify-between"
            >
              <div>
                <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">{stat.label}</p>
                <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
              </div>
              <div className={`${stat.bg} ${stat.color} p-3 rounded-xl`}>
                <stat.icon size={20} />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Ticket List Header */}
        <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Search by ID or subject..." 
              className="pl-10 h-11 bg-white border-slate-200 rounded-xl focus:ring-0"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline" className="h-11 rounded-xl gap-2 border-slate-200">
            <Filter size={16} /> Filters
          </Button>
        </div>

        {/* Ticket List Table-ish */}
        {filteredTickets.length > 0 && (
          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm min-h-[200px] bg-white relative">
             {isLoading ? (
               <div className="absolute inset-0 flex items-center justify-center bg-white/50 z-10">
                 <Loader2 className="w-8 h-8 text-primary animate-spin" />
               </div>
             ) : null}
             <div className="bg-slate-50 px-6 py-3 grid grid-cols-12 gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200">
                <div className="col-span-2">Ticket ID</div>
                <div className="col-span-4">Subject</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-2">Assignee</div>
                <div className="col-span-2">Last Update</div>
             </div>
             <div className="divide-y divide-slate-100">
                {filteredTickets.map((ticket, i) => {
                  const statusInfo = getStatusInfo(ticket);
                  return (
                    <motion.div 
                      key={ticket.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.1 + (i * 0.05) }}
                      onClick={() => navigate(`/user/ticket/${ticket.id}`)}
                      className="px-6 py-5 grid grid-cols-12 gap-4 items-center hover:bg-slate-50 transition-colors cursor-pointer group"
                    >
                      <div className="col-span-2 font-mono text-sm text-slate-500">#{ticket.id}</div>
                      <div className="col-span-4">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900">{ticket.subject}</span>
                          {getPriorityIcon(ticket.priority)}
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5 truncate">{ticket.category}</p>
                      </div>
                      <div className="col-span-2">
                        <Badge variant="outline" className={`${statusInfo.color} capitalize border px-2 py-0.5 text-[10px] font-bold whitespace-nowrap`}>
                          {statusInfo.label}
                        </Badge>
                      </div>
                      <div className="col-span-2 flex items-center gap-2">
                        {(ticket as any).assignedName ? (
                          <>
                            <Avatar className="w-5 h-5 shadow-sm border border-slate-200">
                              <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${ticket.assignedTo}`} />
                              <AvatarFallback className="text-[8px] bg-slate-100">{(ticket as any).assignedName?.[0]}</AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col truncate">
                              <span className="text-xs font-bold text-slate-900 truncate">{(ticket as any).assignedName}</span>
                              <span className="text-[8px] text-slate-400 uppercase font-black tracking-tighter">{(ticket as any).assignedRole || 'Support Specialist'}</span>
                            </div>
                          </>
                        ) : (
                          <span className="text-xs text-slate-400 font-medium italic">Unassigned</span>
                        )}
                      </div>
                      <div className="col-span-2 text-xs text-slate-500 flex items-center justify-between pr-2">
                        <span>{ticket.createdAt ? format(new Date(ticket.createdAt), 'MMM d, h:mm a') : 'N/A'}</span>
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 transition-colors" />
                      </div>
                    </motion.div>
                  );
                })}
             </div>
          </div>
        )}
        
        {!isLoading && filteredTickets.length === 0 && (
          <div className="text-center py-20 bg-slate-50 rounded-2xl mt-4 border border-dashed border-slate-200">
            <LifeBuoy className="w-12 h-12 text-slate-200 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900">No tickets found</h3>
            <p className="text-slate-500">Try adjusting your search or creative a new ticket.</p>
          </div>
        )}
      </main>
    </div>
  );
}
