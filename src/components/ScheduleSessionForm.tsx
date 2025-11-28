import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { CalendarIcon, Clock, User, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Mentor {
  id: string;
  user_id: string;
  username: string;
  rating: number | null;
  total_sessions_taught?: number;
  is_mentor?: boolean;
}

interface Subject {
  id: string;
  name: string;
}

export const ScheduleSessionForm = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(false);

  // Form state
  const [selectedMentor, setSelectedMentor] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState('');
  const [duration, setDuration] = useState('60');

  useEffect(() => {
    fetchMentors();
    fetchSubjects();
  }, []);

  const fetchMentors = async () => {
    try {
      console.log('🔍 Fetching mentors...');
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_id, username, rating, total_sessions_taught, is_mentor')
        .or('is_mentor.eq.true,total_sessions_taught.gte.1')
        .order('rating', { ascending: false });

      if (error) {
        console.error('❌ Error fetching mentors:', error);
        toast({
          title: 'Error',
          description: 'Failed to load mentors. Please refresh the page.',
          variant: 'destructive',
        });
        return;
      }
      console.log('✅ Mentors fetched:', data?.length || 0, 'mentors found');
      console.log('📋 Mentor data:', data);
      setMentors(data || []);
    } catch (error) {
      console.error('❌ Exception fetching mentors:', error);
    }
  };

  const fetchSubjects = async () => {
    try {
      console.log('Fetching subjects...');
      const { data, error } = await supabase
        .from('subjects')
        .select('id, name')
        .order('name');

      if (error) {
        console.error('Error fetching subjects:', error);
        toast({
          title: 'Error',
          description: 'Failed to load subjects. Please refresh the page.',
          variant: 'destructive',
        });
        return;
      }
      console.log('Subjects fetched:', data);
      setSubjects(data || []);
    } catch (error) {
      console.error('Error fetching subjects:', error);
    }
  };

  const handleScheduleRequest = async () => {
    if (!user) {
      toast({
        title: 'Not Authenticated',
        description: 'Please log in to schedule a session.',
        variant: 'destructive',
      });
      return;
    }

    if (!selectedMentor || !selectedSubject || !title || !selectedDate || !selectedTime) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      // Combine date and time
      const [hours, minutes] = selectedTime.split(':');
      const requestedDateTime = new Date(selectedDate);
      requestedDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      // Validate date is in the future
      if (requestedDateTime < new Date()) {
        toast({
          title: 'Invalid Date',
          description: 'Please select a future date and time.',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('session_requests')
        .insert({
          student_id: user.id,
          mentor_id: selectedMentor,
          subject_id: selectedSubject,
          title,
          description: description || null,
          requested_time: requestedDateTime.toISOString(),
          duration: parseInt(duration),
          status: 'pending',
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Error creating session request:', error);
        throw error;
      }

      console.log('✅ Session request created successfully:', data);
      console.log('📋 Request details:', {
        student_id: user.id,
        mentor_id: selectedMentor,
        title,
        status: 'pending',
      });

      toast({
        title: 'Session Request Sent! ✅',
        description: 'The mentor will receive a notification and respond soon.',
      });

      // Reset form
      setSelectedMentor('');
      setSelectedSubject('');
      setTitle('');
      setDescription('');
      setSelectedDate(undefined);
      setSelectedTime('');
      setDuration('60');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send session request',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Schedule a Session</CardTitle>
        <CardDescription>
          Request a mentoring session and the mentor will approve based on their availability
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Select Mentor */}
        <div className="space-y-2">
          <Label htmlFor="mentor">Select Mentor *</Label>
          <Select value={selectedMentor} onValueChange={setSelectedMentor}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a mentor" />
            </SelectTrigger>
            <SelectContent>
              {mentors.length === 0 ? (
                <div className="p-2 text-sm text-muted-foreground text-center">
                  No mentors available
                </div>
              ) : (
                mentors.map((mentor) => (
                  <SelectItem key={mentor.user_id} value={mentor.user_id}>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      {mentor.username || 'Anonymous'} - ⭐ {mentor.rating?.toFixed(1) || '0.0'}
                    </div>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Select Subject */}
        <div className="space-y-2">
          <Label htmlFor="subject">Subject *</Label>
          <Select value={selectedSubject} onValueChange={setSelectedSubject}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a subject" />
            </SelectTrigger>
            <SelectContent>
              {subjects.length === 0 ? (
                <div className="p-2 text-sm text-muted-foreground text-center">
                  No subjects available
                </div>
              ) : (
                subjects.map((subject) => (
                  <SelectItem key={subject.id} value={subject.id}>
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4" />
                      {subject.name}
                    </div>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Session Title */}
        <div className="space-y-2">
          <Label htmlFor="title">Session Title *</Label>
          <Input
            id="title"
            placeholder="e.g., Introduction to Calculus"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            placeholder="What topics do you want to cover?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>

        {/* Date Picker */}
        <div className="space-y-2">
          <Label>Preferred Date *</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full justify-start text-left font-normal',
                  !selectedDate && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? format(selectedDate, 'PPP') : 'Pick a date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                initialFocus
                disabled={(date) => date < new Date()}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Time Picker */}
        <div className="space-y-2">
          <Label htmlFor="time">Preferred Time *</Label>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <Input
              id="time"
              type="time"
              value={selectedTime}
              onChange={(e) => setSelectedTime(e.target.value)}
            />
          </div>
        </div>

        {/* Duration */}
        <div className="space-y-2">
          <Label htmlFor="duration">Duration (minutes)</Label>
          <Select value={duration} onValueChange={setDuration}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">30 minutes</SelectItem>
              <SelectItem value="60">60 minutes</SelectItem>
              <SelectItem value="90">90 minutes</SelectItem>
              <SelectItem value="120">120 minutes</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Submit Button */}
        <Button
          onClick={handleScheduleRequest}
          disabled={loading}
          className="w-full"
        >
          {loading ? 'Sending Request...' : 'Request Session'}
        </Button>
      </CardContent>
    </Card>
  );
};
