import { useEffect, useState } from "react";
import DetailSheet from "@/components/DetailSheet";
import { Camera } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageProvider";

interface EditProfileSheetProps {
  open: boolean;
  onClose: () => void;
  user: { name: string; email: string; client_description: string; website: string; avatar_url: string | null };
  onSave: (patch: { client_description: string; website: string; avatar_url: string | null }) => void | Promise<void>;
}

const EditProfileSheet = ({ open, onClose, user, onSave }: EditProfileSheetProps) => {
  const { tx } = useLanguage();
  const [description, setDescription] = useState(user.client_description);
  const [website, setWebsite] = useState(user.website);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user.avatar_url);

  useEffect(() => {
    if (!open) return;
    setDescription(user.client_description);
    setWebsite(user.website);
    setAvatarPreview(user.avatar_url);
  }, [open, user]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setAvatarPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    void Promise.resolve(onSave({ client_description: description, website, avatar_url: avatarPreview })).then(() =>
      onClose(),
    );
  };

  return (
    <DetailSheet open={open} onClose={onClose} title={tx("Edit Profile", "Editar perfil")}>
      <div className="space-y-5">
        {/* Avatar */}
        <div className="flex flex-col items-center gap-2 pb-2">
          <label className="relative cursor-pointer group">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center overflow-hidden border-2 border-border">
              {avatarPreview ? (
                <img src={avatarPreview} alt={tx("Avatar", "Avatar")} className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-bold text-muted-foreground">{user.name.charAt(0)}</span>
              )}
            </div>
            <div className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-primary flex items-center justify-center shadow-md">
              <Camera size={14} className="text-primary-foreground" />
            </div>
            <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
          </label>
          <p className="text-xs text-primary font-medium">{tx("Edit picture", "Editar foto")}</p>
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1 block">{tx("Name", "Nombre")}</label>
          <input
            type="text"
            value={user.name}
            readOnly
            disabled
            className="w-full bg-muted/60 rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground cursor-not-allowed"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Email</label>
          <input
            type="email"
            value={user.email}
            readOnly
            disabled
            className="w-full bg-muted/60 rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground cursor-not-allowed"
          />
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1 block">{tx("Bio / Description", "Bio / Descripcion")}</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)}
            placeholder={tx("Tell clients about yourself...", "Cuentales a tus clientes sobre ti...")}
            className="w-full bg-muted rounded-md px-3 py-2.5 text-sm font-medium placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 min-h-[80px] resize-none" />
        </div>

        <Field label={tx("Website", "Sitio web")} value={website} onChange={setWebsite} placeholder="https://yoursite.com" />

        <button onClick={handleSave}
          className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-md active:scale-[0.98] transition-transform mt-2">
          {tx("Save Profile", "Guardar perfil")}
        </button>
      </div>
    </DetailSheet>
  );
};

export default EditProfileSheet;

const Field = ({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  type?: string;
}) => (
  <div>
    <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-muted rounded-md px-3 py-2.5 text-sm font-medium placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
    />
  </div>
);
