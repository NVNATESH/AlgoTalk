'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';
import { Loader2, Plus, X } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { Field } from '@/components/auth/Field';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/stores/authStore';
import type { PublicProfile } from '@/types/profile';

const schema = z.object({
  name: z.string().min(1).max(80),
  bio: z.string().max(500),
  location: z.string().max(120),
  education: z.string().max(160),
  github: z.string().max(160),
  linkedin: z.string().max(160),
  twitter: z.string().max(160),
});
type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  profile: PublicProfile;
  onUpdated: (next: PublicProfile) => void;
}

export function EditProfileDialog({ open, onClose, profile, onUpdated }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [skills, setSkills] = useState<string[]>(profile.skills);
  const [skillDraft, setSkillDraft] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      name: profile.name,
      bio: profile.bio,
      location: profile.location,
      education: profile.education,
      github: profile.socialLinks.github,
      linkedin: profile.socialLinks.linkedin,
      twitter: profile.socialLinks.twitter,
    },
  });

  const addSkill = () => {
    const v = skillDraft.trim();
    if (!v) return;
    if (skills.includes(v)) return;
    if (skills.length >= 30) {
      toast.error('Max 30 skills');
      return;
    }
    setSkills([...skills, v]);
    setSkillDraft('');
  };

  const removeSkill = (s: string) => setSkills(skills.filter((x) => x !== s));

  const onSubmit = async (raw: FormValues) => {
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? 'Invalid form');
      return;
    }
    setSubmitting(true);
    try {
      const r = await api<{ user: any }>('/profile/me', {
        method: 'PATCH',
        auth: true,
        body: {
          name: parsed.data.name,
          bio: parsed.data.bio,
          location: parsed.data.location,
          education: parsed.data.education,
          socialLinks: {
            github: parsed.data.github,
            linkedin: parsed.data.linkedin,
            twitter: parsed.data.twitter,
          },
          skills,
        },
      });
      // Update auth store with the new fields too (so header / dashboard reflect)
      useAuth.setState((s) => ({ user: s.user ? { ...s.user, name: r.user.name } : s.user }));
      onUpdated({
        ...profile,
        name: r.user.name,
        bio: r.user.bio,
        location: r.user.location,
        education: r.user.education,
        socialLinks: r.user.socialLinks ?? profile.socialLinks,
        skills: r.user.skills ?? skills,
      });
      toast.success('Profile updated');
      onClose();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Update failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} size="lg" title="Edit profile">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Field label="Display name" {...register('name')} error={errors.name?.message} />
        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-300">Bio</label>
          <textarea
            {...register('bio')}
            rows={3}
            placeholder="Tell people what you're working on..."
            className="input-base resize-y"
          />
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field label="Location" {...register('location')} placeholder="e.g. Bangalore, India" />
          <Field label="Education" {...register('education')} placeholder="e.g. MIT, B.Tech CS" />
        </div>

        <fieldset>
          <legend className="mb-2 text-sm font-medium text-zinc-300">Social links</legend>
          <div className="space-y-2">
            <Field label="GitHub" {...register('github')} placeholder="github.com/..." />
            <Field label="LinkedIn" {...register('linkedin')} placeholder="linkedin.com/in/..." />
            <Field label="Twitter / X" {...register('twitter')} placeholder="@handle" />
          </div>
        </fieldset>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-300">Skills / languages</label>
          <div className="flex flex-wrap gap-1.5 rounded-xl border border-white/10 bg-white/5 p-2">
            {skills.map((s) => (
              <span
                key={s}
                className="flex items-center gap-1 rounded-full bg-accent-violet/15 px-2.5 py-0.5 text-xs text-accent-violet"
              >
                {s}
                <button
                  type="button"
                  onClick={() => removeSkill(s)}
                  className="opacity-60 hover:opacity-100"
                  aria-label={`Remove ${s}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            <div className="flex items-center gap-1">
              <input
                value={skillDraft}
                onChange={(e) => setSkillDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addSkill();
                  }
                }}
                placeholder="Add a skill…"
                className="bg-transparent px-2 py-1 text-sm focus:outline-none"
              />
              <button
                type="button"
                onClick={addSkill}
                disabled={!skillDraft.trim()}
                className="rounded-md p-1 text-zinc-400 hover:bg-white/5 hover:text-zinc-100 disabled:opacity-40"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <p className="mt-1 text-xs text-zinc-500">Press Enter to add. Up to 30.</p>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-white/5 pt-4">
          <button type="button" onClick={onClose} className="btn-ghost">
            Cancel
          </button>
          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
