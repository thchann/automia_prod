import { useState } from "react";
import DetailSheet from "@/components/DetailSheet";
import { Camera } from "lucide-react";

interface EditProfileSheetProps {
  open: boolean;
  onClose: () => void;
  user: { name: string; email: string; client_description: string; website: string; avatar_url: string | null };
  onSave: (user: { name: string; email: string; client_description: string; website: string; avatar_url: string | null }) => void;
}

const EditProfileSheet = ({ open, onClose, user, onSave }: EditProfileSheetProps) => {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [description, setDescription] = useState(user.client_description);
  const [website, setWebsite] = useState(user.website);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user.avatar_url);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setAvatarPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    onSave({ name, email, client_description: description, website, avatar_url: avatarPreview });
    onClose();
  };

  return (
    <DetailSheet open={open} onClose={onClose} title="Edit Profile">
      <div className="space-y-5">
        {/* Avatar */}
        <div className="flex flex-col items-center gap-2 pb-2">
          <label className="relative cursor-pointer group">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center overflow-hidden border-2 border-border">
              {avatarPreview ? (
                <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-bold text-muted-foreground">{name.charAt(0)}</span>
              )}
            </div>
            <div className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-primary flex items-center justify-center shadow-md">
              <Camera size={14} className="text-primary-foreground" />
            </div>
            <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
          </label>
          <p className="text-xs text-primary font-medium">Edit picture</p>
        </div>

        <Field label="Name" value={name} onChange={setName} placeholder="Your name" />
        <Field label="Email" value={email} onChange={setEmail} placeholder="you@example.com" type="email" />

        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Bio / Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)}
            placeholder="Tell clients about yourself..."
            className="w-full bg-muted rounded-md px-3 py-2.5 text-sm font-medium placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 min-h-[80px] resize-none" />
        </div>

        <Field label="Website" value={website} onChange={setWebsite} placeholder="https://yoursite.com" />

        <button onClick={handleSave}
          className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-md active:scale-[0.98] transition-transform mt-2">
          Save Profile
        </button>
      </div>
    </DetailSheet>
  );
};

export default EditProfileSheet;

const Field = ({ label, value, onChange, placeholder, type = "text" }: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string; type?: string;
}) => (
  <div>
    <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
    <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
      className="w-full bg-muted rounded-md px-3 py-2.5 text-sm font-medium placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30" />
  </div>
);
