import React, { useState } from 'react';
import { Modal, ModalHeader, ModalTitle, ModalContent, ModalFooter } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { 
  User, 
  Mail, 
  Activity, 
  Target, 
  MessageSquare,
  Calendar,
  Filter
} from 'lucide-react';

interface PartnerRequestModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (requestData: PartnerRequestData) => void;
  availablePartners?: Partner[];
  isLoading?: boolean;
}

interface Partner {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  activityLevel: string;
  experience: string;
  categories: string[];
  rating: number;
  totalPartners: number;
}

interface PartnerRequestData {
  partnerId?: string;
  message?: string;
  allowsEventReview: boolean;
  allowsPlanCreation: boolean;
  allowsGoalSetting: boolean;
  preferredGender?: 'MALE' | 'FEMALE' | 'OTHER';
  preferredAgeRange?: string;
  preferredExperience?: 'beginner' | 'intermediate' | 'advanced';
  preferredCategories: string[];
}

const ACTIVITY_CATEGORIES = [
  'FITNESS',
  'SPIRITUAL', 
  'HYBRID',
  'WORKOUT',
  'MEDITATION',
  'PRAYER',
  'STUDY',
  'SERVICE'
];

const AGE_RANGES = [
  '18-25',
  '26-35',
  '36-45',
  '46-55',
  '56-65',
  '65+'
];

export function PartnerRequestModal({
  open,
  onClose,
  onSubmit,
  availablePartners = [],
  isLoading = false,
}: PartnerRequestModalProps) {
  const [requestType, setRequestType] = useState<'specific' | 'matched'>('matched');
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>('');
  const [message, setMessage] = useState('');
  const [permissions, setPermissions] = useState({
    allowsEventReview: true,
    allowsPlanCreation: true,
    allowsGoalSetting: true,
  });
  const [preferences, setPreferences] = useState({
    preferredGender: '' as '' | 'MALE' | 'FEMALE' | 'OTHER',
    preferredAgeRange: '',
    preferredExperience: '' as '' | 'beginner' | 'intermediate' | 'advanced',
    preferredCategories: [] as string[],
  });

  const handleCategoryToggle = (category: string) => {
    setPreferences(prev => ({
      ...prev,
      preferredCategories: prev.preferredCategories.includes(category)
        ? prev.preferredCategories.filter(c => c !== category)
        : [...prev.preferredCategories, category]
    }));
  };

  const handleSubmit = () => {
    const requestData: PartnerRequestData = {
      ...(requestType === 'specific' ? { partnerId: selectedPartnerId } : {}),
      message: message.trim() || undefined,
      ...permissions,
      ...(requestType === 'matched' ? {
        preferredGender: preferences.preferredGender || undefined,
        preferredAgeRange: preferences.preferredAgeRange || undefined,
        preferredExperience: preferences.preferredExperience || undefined,
        preferredCategories: preferences.preferredCategories,
      } : { preferredCategories: [] }),
    };

    onSubmit(requestData);
  };

  const isFormValid = () => {
    if (requestType === 'specific') {
      return selectedPartnerId !== '';
    }
    return preferences.preferredCategories.length > 0;
  };

  return (
    <Modal open={open} onClose={onClose} size="lg">
      <ModalHeader onClose={onClose}>
        <ModalTitle>Request Accountability Partner</ModalTitle>
      </ModalHeader>

      <ModalContent className="space-y-6">
        {/* Request Type Selection */}
        <div>
          <label className="text-sm font-medium">Partner Selection</label>
          <div className="mt-2 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setRequestType('matched')}
              className={`p-4 border rounded-lg text-left transition-colors ${
                requestType === 'matched'
                  ? 'border-primary bg-primary/5'
                  : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <Filter className="w-4 h-4" />
                <span className="font-medium">Auto-Match</span>
              </div>
              <p className="text-sm text-muted-foreground">
                We'll find partners based on your preferences
              </p>
            </button>

            <button
              type="button"
              onClick={() => setRequestType('specific')}
              className={`p-4 border rounded-lg text-left transition-colors ${
                requestType === 'specific'
                  ? 'border-primary bg-primary/5'
                  : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <User className="w-4 h-4" />
                <span className="font-medium">Choose Specific</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Select a specific partner from our community
              </p>
            </button>
          </div>
        </div>

        {/* Specific Partner Selection */}
        {requestType === 'specific' && (
          <div>
            <label className="text-sm font-medium mb-3 block">Available Partners</label>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {availablePartners.map((partner) => (
                <div
                  key={partner.id}
                  onClick={() => setSelectedPartnerId(partner.id)}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedPartnerId === partner.id
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      {partner.avatar ? (
                        <img src={partner.avatar} alt={partner.name} className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <User className="w-5 h-5" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium">{partner.name}</h4>
                      <p className="text-sm text-muted-foreground">{partner.email}</p>
                      <div className="flex gap-1 mt-1">
                        {partner.categories.slice(0, 3).map(cat => (
                          <Badge key={cat} variant="outline" className="text-xs">{cat}</Badge>
                        ))}
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      <div className="text-muted-foreground">Rating: {partner.rating}/5</div>
                      <div className="text-muted-foreground">{partner.totalPartners} partners</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Auto-Match Preferences */}
        {requestType === 'matched' && (
          <div className="space-y-4">
            <h4 className="font-medium">Partner Preferences (Optional)</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Preferred Gender</label>
                <select
                  value={preferences.preferredGender}
                  onChange={(e) => setPreferences(prev => ({ ...prev, preferredGender: e.target.value as any }))}
                  className="mt-1 w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">No preference</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium">Age Range</label>
                <select
                  value={preferences.preferredAgeRange}
                  onChange={(e) => setPreferences(prev => ({ ...prev, preferredAgeRange: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">No preference</option>
                  {AGE_RANGES.map(range => (
                    <option key={range} value={range}>{range}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium">Experience Level</label>
                <select
                  value={preferences.preferredExperience}
                  onChange={(e) => setPreferences(prev => ({ ...prev, preferredExperience: e.target.value as any }))}
                  className="mt-1 w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">No preference</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Focus Areas *</label>
              <p className="text-xs text-muted-foreground mb-2">
                Select the areas where you want accountability support
              </p>
              <div className="flex flex-wrap gap-2">
                {ACTIVITY_CATEGORIES.map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => handleCategoryToggle(category)}
                    className={`px-3 py-1 text-sm border rounded-full transition-colors ${
                      preferences.preferredCategories.includes(category)
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Partnership Permissions */}
        <div>
          <h4 className="font-medium mb-3">Partnership Permissions</h4>
          <div className="space-y-3">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={permissions.allowsEventReview}
                onChange={(e) => setPermissions(prev => ({ ...prev, allowsEventReview: e.target.checked }))}
                className="rounded"
              />
              <div>
                <span className="text-sm font-medium">Event Review</span>
                <p className="text-xs text-muted-foreground">Allow partner to review and approve your activities</p>
              </div>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={permissions.allowsPlanCreation}
                onChange={(e) => setPermissions(prev => ({ ...prev, allowsPlanCreation: e.target.checked }))}
                className="rounded"
              />
              <div>
                <span className="text-sm font-medium">Plan Creation</span>
                <p className="text-xs text-muted-foreground">Allow partner to create workout and spiritual plans for you</p>
              </div>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={permissions.allowsGoalSetting}
                onChange={(e) => setPermissions(prev => ({ ...prev, allowsGoalSetting: e.target.checked }))}
                className="rounded"
              />
              <div>
                <span className="text-sm font-medium">Goal Setting</span>
                <p className="text-xs text-muted-foreground">Allow partner to set and modify your fitness and spiritual goals</p>
              </div>
            </label>
          </div>
        </div>

        {/* Personal Message */}
        <div>
          <label className="text-sm font-medium">Personal Message (Optional)</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Introduce yourself and share why you're looking for an accountability partner..."
            rows={3}
            className="mt-1 w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          />
          <p className="text-xs text-muted-foreground mt-1">
            {message.length}/500 characters
          </p>
        </div>
      </ModalContent>

      <ModalFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit} 
          disabled={!isFormValid() || isLoading}
          className="min-w-24"
        >
          {isLoading ? 'Sending...' : 'Send Request'}
        </Button>
      </ModalFooter>
    </Modal>
  );
}