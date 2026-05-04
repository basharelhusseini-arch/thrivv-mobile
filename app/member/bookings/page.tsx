'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Calendar, Clock, Users, CheckCircle, Star, Award, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { trainersData, type Trainer } from '@/lib/trainers-data';
import PageHeader from '@/components/PageHeader';

interface ClassData {
  id: string;
  name: string;
  description: string;
  trainerId: string;
  date: string;
  startTime: string;
  endTime: string;
  capacity: number;
  enrolledMembers: string[];
  waitlist: string[];
  status: string;
}

interface TrainerData {
  id: string;
  firstName: string;
  lastName: string;
  specialization: string;
}

interface Booking {
  id: string;
  user_id: string;
  type: 'class' | 'trainer_consultation' | 'trainer_session';
  item_id: string;
  title: string;
  start_time: string;
  duration_minutes: number;
  status: 'booked' | 'cancelled';
  created_at: string;
}

export default function MemberBookingsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'classes' | 'trainers'>('classes');
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [trainers, setTrainers] = useState<Record<string, TrainerData>>({});
  const [memberId, setMemberId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  
  // Booking modal state
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedTrainer, setSelectedTrainer] = useState<Trainer | null>(null);
  const [bookingType, setBookingType] = useState<'consultation' | 'session'>('consultation');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');

  useEffect(() => {
    const id = localStorage.getItem('memberId');
    if (!id) {
      router.push('/member/login');
      return;
    }
    setMemberId(id);
    fetchData(id);
  }, [router]);

  const fetchData = async (userId: string) => {
    try {
      const [classesRes, trainersRes] = await Promise.all([
        fetch('/api/classes'),
        fetch('/api/trainers'),
      ]);

      const classesData = await classesRes.json();
      const trainersData = await trainersRes.json();

      const trainersMap: Record<string, TrainerData> = {};
      trainersData.forEach((t: TrainerData) => {
        trainersMap[t.id] = t;
      });

      setTrainers(trainersMap);
      setClasses(classesData);
      
      // Load bookings from localStorage
      const savedBookings = localStorage.getItem(`bookings_${userId}`);
      if (savedBookings) {
        setBookings(JSON.parse(savedBookings));
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBookClass = async (classId: string) => {
    if (!memberId) return;

    try {
      const response = await fetch(`/api/classes/${classId}/enroll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId }),
      });

      if (response.ok) {
        fetchData(memberId);
        alert('Successfully booked class!');
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to book class');
      }
    } catch (error) {
      alert('An error occurred. Please try again.');
    }
  };

  const handleCancelClass = async (classId: string) => {
    if (!memberId || !confirm('Cancel this booking?')) return;

    try {
      const response = await fetch(`/api/classes/${classId}/enroll`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId }),
      });

      if (response.ok) {
        fetchData(memberId);
        alert('Booking cancelled');
      }
    } catch (error) {
      alert('An error occurred.');
    }
  };

  const openBookingModal = (trainer: Trainer, type: 'consultation' | 'session') => {
    setSelectedTrainer(trainer);
    setBookingType(type);
    setShowBookingModal(true);
    
    // Set default date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setSelectedDate(tomorrow.toISOString().split('T')[0]);
    setSelectedTime('09:00');
  };

  const handleConfirmBooking = () => {
    if (!memberId || !selectedTrainer || !selectedDate || !selectedTime) return;

    const newBooking: Booking = {
      id: `booking-${Date.now()}`,
      user_id: memberId,
      type: bookingType === 'consultation' ? 'trainer_consultation' : 'trainer_session',
      item_id: selectedTrainer.id,
      title: `${bookingType === 'consultation' ? 'Consultation' : 'Session'} with ${selectedTrainer.fullName}`,
      start_time: `${selectedDate}T${selectedTime}:00`,
      duration_minutes: bookingType === 'consultation' ? 30 : 60,
      status: 'booked',
      created_at: new Date().toISOString(),
    };

    const updatedBookings = [...bookings, newBooking];
    setBookings(updatedBookings);
    localStorage.setItem(`bookings_${memberId}`, JSON.stringify(updatedBookings));

    setShowBookingModal(false);
    setSelectedTrainer(null);
    alert('Booking confirmed!');
  };

  const getAvailableDates = () => {
    const dates = [];
    for (let i = 1; i <= 14; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      dates.push(date.toISOString().split('T')[0]);
    }
    return dates;
  };

  const timeSlots = [
    '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
    '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
    '18:00', '19:00', '20:00', '21:00'
  ];

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-thrivv-gold-500/10 border border-thrivv-gold-500/30 flex items-center justify-center animate-pulse">
            <Calendar className="w-5 h-5 text-thrivv-gold-500" />
          </div>
          <span className="text-xs uppercase tracking-[0.25em] text-thrivv-text-muted">
            Loading bookings
          </span>
        </div>
      </div>
    );
  }

  const upcomingClasses = classes
    .filter(c => {
      const classDate = new Date(`${c.date}T${c.startTime}`);
      return classDate >= new Date() && c.status === 'scheduled';
    })
    .sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.startTime}`);
      const dateB = new Date(`${b.date}T${b.startTime}`);
      return dateA.getTime() - dateB.getTime();
    });

  const isEnrolled = (classId: string) => {
    return memberId ? classes.find(c => c.id === classId)?.enrolledMembers.includes(memberId) : false;
  };

  const isFull = (classItem: ClassData) => {
    return classItem.enrolledMembers.length >= classItem.capacity;
  };

  const upcomingBookings = bookings.filter(b => 
    b.status === 'booked' && new Date(b.start_time) >= new Date()
  ).sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Schedule"
        title="Bookings"
        subtitle="Book classes and trainer sessions at your gym."
      />

      {/* Upcoming Bookings */}
      {upcomingBookings.length > 0 && (
        <div className="premium-card p-6 mb-8 animate-fade-in">
          <h2 className="text-xl font-semibold text-thrivv-text-primary mb-4">Upcoming Bookings</h2>
          <div className="space-y-3">
            {upcomingBookings.slice(0, 3).map(booking => (
              <div key={booking.id} className="flex items-center justify-between p-4 bg-thrivv-bg-card/30 rounded-xl">
                <div>
                  <p className="text-thrivv-text-primary font-medium">{booking.title}</p>
                  <p className="text-thrivv-text-muted text-sm">
                    {new Date(booking.start_time).toLocaleDateString('en-US', { 
                      weekday: 'short', month: 'short', day: 'numeric' 
                    })} at {new Date(booking.start_time).toLocaleTimeString('en-US', { 
                      hour: 'numeric', minute: '2-digit' 
                    })}
                  </p>
                </div>
                <span className="success-badge px-3 py-1 text-xs">Confirmed</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex space-x-2 mb-8">
        <button
          onClick={() => setActiveTab('classes')}
          className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
            activeTab === 'classes'
              ? 'btn-primary'
              : 'btn-ghost'
          }`}
        >
          Classes
        </button>
        <button
          onClick={() => setActiveTab('trainers')}
          className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
            activeTab === 'trainers'
              ? 'btn-primary'
              : 'btn-ghost'
          }`}
        >
          Trainers
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'classes' ? (
        <div className="animate-fade-in">
          {upcomingClasses.length === 0 ? (
            <div className="premium-card p-12 text-center">
              <Calendar className="w-16 h-16 text-thrivv-text-muted mx-auto mb-4" />
              <p className="text-thrivv-text-secondary">No upcoming classes available</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcomingClasses.map((classItem) => {
                const trainer = trainers[classItem.trainerId];
                const enrolled = isEnrolled(classItem.id);
                const full = isFull(classItem);

                return (
                  <div
                    key={classItem.id}
                    className={`premium-card p-6 ${enrolled ? 'border-thrivv-gold-500/30 glow-gold' : ''}`}
                  >
                    <h3 className="text-xl font-semibold text-thrivv-text-primary mb-2">
                      {classItem.name}
                    </h3>
                    <p className="text-thrivv-text-secondary text-sm mb-4">
                      {classItem.description}
                    </p>

                    <div className="space-y-2 mb-6">
                      {trainer && (
                        <div className="text-sm text-thrivv-text-secondary">
                          <span className="font-medium">Trainer:</span> {trainer.firstName} {trainer.lastName}
                        </div>
                      )}
                      <div className="flex items-center text-sm text-thrivv-text-secondary">
                        <Calendar className="w-4 h-4 mr-2 text-thrivv-gold-500" />
                        {new Date(classItem.date).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </div>
                      <div className="flex items-center text-sm text-thrivv-text-secondary">
                        <Clock className="w-4 h-4 mr-2 text-thrivv-gold-500" />
                        {classItem.startTime} - {classItem.endTime}
                      </div>
                      <div className="flex items-center text-sm text-thrivv-text-secondary">
                        <Users className="w-4 h-4 mr-2 text-thrivv-gold-500" />
                        {classItem.enrolledMembers.length}/{classItem.capacity} enrolled
                      </div>
                    </div>

                    <div className="pt-4 border-t border-thrivv-gold-500/10">
                      {enrolled ? (
                        <div className="space-y-2">
                          <div className="flex items-center text-thrivv-neon-green text-sm mb-2">
                            <CheckCircle className="w-4 h-4 mr-2" />
                            You&apos;re enrolled
                          </div>
                          <button
                            onClick={() => handleCancelClass(classItem.id)}
                            className="w-full px-4 py-2 border border-red-500/30 text-red-400 rounded-xl hover:bg-red-500/10 transition-all duration-300"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : full ? (
                        <div className="text-center text-sm text-thrivv-text-muted py-2">
                          Class is full
                        </div>
                      ) : (
                        <button
                          onClick={() => handleBookClass(classItem.id)}
                          className="w-full btn-primary py-3"
                        >
                          Book Class
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trainersData.map((trainer) => (
              <div key={trainer.id} className="premium-card p-6">
                {/* Trainer Avatar */}
                <div className="flex items-center space-x-4 mb-4">
                  <div className="w-16 h-16 rounded-xl bg-thrivv-gold-500 flex items-center justify-center overflow-hidden relative">
                    <Image 
                      src={trainer.avatar} 
                      alt={trainer.fullName}
                      width={64}
                      height={64}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-thrivv-text-primary">
                      {trainer.fullName}
                    </h3>
                    <p className="text-sm text-thrivv-text-secondary">{trainer.specialty}</p>
                  </div>
                </div>

                {/* Rating */}
                <div className="flex items-center space-x-2 mb-4">
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < Math.floor(trainer.rating)
                            ? 'text-thrivv-gold-500 fill-thrivv-gold-500'
                            : 'text-thrivv-text-muted'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-thrivv-text-secondary">
                    {trainer.rating} ({trainer.reviewCount})
                  </span>
                </div>

                {/* Credentials Preview */}
                <div className="mb-4">
                  <div className="flex items-start space-x-2 mb-2">
                    <Award className="w-4 h-4 text-thrivv-gold-500 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-thrivv-text-muted line-clamp-2">
                      {trainer.credentials.slice(0, 2).join(' • ')}
                    </p>
                  </div>
                </div>

                {/* Pricing */}
                <div className="space-y-2 mb-4 text-sm">
                  <div className="flex justify-between text-thrivv-text-secondary">
                    <span>Consultation (30min)</span>
                    <span className="font-semibold text-thrivv-gold-500">£{trainer.priceConsultation}</span>
                  </div>
                  <div className="flex justify-between text-thrivv-text-secondary">
                    <span>Session (60min)</span>
                    <span className="font-semibold text-thrivv-gold-500">£{trainer.priceSession}</span>
                  </div>
                </div>

                {/* Availability */}
                <p className="text-xs text-thrivv-text-muted mb-4">{trainer.availability}</p>

                {/* Booking Buttons */}
                <div className="grid grid-cols-2 gap-2 pt-4 border-t border-thrivv-gold-500/10">
                  <button
                    onClick={() => openBookingModal(trainer, 'consultation')}
                    className="btn-ghost py-2 text-sm"
                  >
                    Consultation
                  </button>
                  <button
                    onClick={() => openBookingModal(trainer, 'session')}
                    className="btn-primary py-2 text-sm"
                  >
                    Book Session
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Booking Modal */}
      {showBookingModal && selectedTrainer && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card max-w-md w-full p-8 animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-thrivv-text-primary">
                Book {bookingType === 'consultation' ? 'Consultation' : 'Session'}
              </h2>
              <button
                onClick={() => setShowBookingModal(false)}
                className="text-thrivv-text-muted hover:text-thrivv-text-primary transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="mb-6">
              <div className="flex items-center space-x-3 mb-4">
                <Image 
                  src={selectedTrainer.avatar} 
                  alt={selectedTrainer.fullName}
                  width={48}
                  height={48}
                  className="w-12 h-12 rounded-xl"
                />
                <div>
                  <p className="font-medium text-thrivv-text-primary">{selectedTrainer.fullName}</p>
                  <p className="text-sm text-thrivv-text-secondary">{selectedTrainer.specialty}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-thrivv-text-secondary mb-2">
                  Select Date
                </label>
                <select
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="input-premium w-full px-4 py-3"
                >
                  {getAvailableDates().map(date => (
                    <option key={date} value={date}>
                      {new Date(date).toLocaleDateString('en-US', { 
                        weekday: 'long', month: 'long', day: 'numeric' 
                      })}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-thrivv-text-secondary mb-2">
                  Select Time
                </label>
                <select
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  className="input-premium w-full px-4 py-3"
                >
                  {timeSlots.map(time => (
                    <option key={time} value={time}>{time}</option>
                  ))}
                </select>
              </div>

              <div className="bg-thrivv-bg-card/50 p-4 rounded-xl">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-thrivv-text-secondary">Duration</span>
                  <span className="text-thrivv-text-primary">{bookingType === 'consultation' ? '30' : '60'} min</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-thrivv-text-secondary">Price</span>
                  <span className="text-thrivv-gold-500 font-semibold">
                    £{bookingType === 'consultation' ? selectedTrainer.priceConsultation : selectedTrainer.priceSession}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowBookingModal(false)}
                className="btn-ghost py-3"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmBooking}
                className="btn-primary py-3"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
