import { useState, type Dispatch, type SetStateAction } from 'react';
import { RotateCw, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GeneratedAvatarPanel } from '@/features/avatar/generated-avatar-panel';
import { emptyAvatar, type AvatarState } from '../../../shared/avatar';
import { answersFor, type DraftProfile } from './draft';
import { useAvatarConcepts } from './use-avatar-concepts';

export function AvatarSection({
  draft,
  onDraftChange,
  savedAvatar,
}: {
  draft: DraftProfile;
  onDraftChange: Dispatch<SetStateAction<DraftProfile>>;
  savedAvatar?: AvatarState;
}) {
  const [detailRequested, setDetailRequested] = useState(false);
  const answers = answersFor(draft);
  const subject = draft.avatar?.recipe?.subject ?? '';
  const subjects = useAvatarConcepts('subject', answers, '', true);
  const details = useAvatarConcepts('detail', answers, subject, detailRequested && !!subject);

  const updateRecipe = (field: 'subject' | 'detail', value: string) => {
    if (field === 'subject') setDetailRequested(false);
    onDraftChange((current) => {
      const avatar = current.avatar ?? emptyAvatar();
      const recipe = { subject: avatar.recipe?.subject ?? '', detail: avatar.recipe?.detail ?? '', [field]: value };
      if (avatar.recipe?.[field] === value) return current;

      // An edited recipe is a new proposal. Keep only the image that was already saved.
      const savedId = recipe.subject.trim() && avatar.recipe ? savedAvatar?.generatedAssetId : undefined;
      return {
        ...current,
        avatar: {
          ...avatar,
          recipe,
          generatedAssetId: savedId,
          adoptedRecipe: savedId ? savedAvatar?.adoptedRecipe ?? savedAvatar?.recipe : undefined,
        },
      };
    });
  };

  const adopt = (id: string) => onDraftChange((current) => ({
    ...current,
    avatar: {
      ...(current.avatar ?? emptyAvatar()),
      generatedAssetId: id,
      adoptedRecipe: current.avatar?.recipe,
    },
  }));

  return (
    <div className="grid gap-4">
      <p className="text-sm text-muted-foreground">描述一个代表你的角色，在这里生成并挑选头像。</p>
      <label className="grid gap-2 text-sm font-bold">头像主体<Input value={subject} onChange={(event) => updateRecipe('subject', event.target.value)} maxLength={80} placeholder="例如：一只背着书包的小狐狸" className="h-12 rounded-xl bg-white" /></label>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={subjects.refresh} disabled={subjects.loading} className="rounded-xl bg-white font-bold"><RotateCw className="size-3" /> {subjects.options.length ? '重新推荐主体' : '推荐主体'}</Button>
        {subjects.options.map((item) => <button key={item} type="button" onClick={() => updateRecipe('subject', item.slice(0, 80))} className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-bold">{item}</button>)}
        {subjects.loading && <span className="text-xs">正在想主体…</span>}
      </div>
      {subjects.error && <p role="alert" className="text-xs text-destructive">{subjects.error} 可以自己填写主体。</p>}
      <label className="grid gap-2 text-sm font-bold">配件或动作<Input value={draft.avatar?.recipe?.detail ?? ''} onChange={(event) => updateRecipe('detail', event.target.value)} maxLength={80} placeholder="可以留空" className="h-12 rounded-xl bg-white" /></label>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => { setDetailRequested(true); details.refresh(); }} disabled={!subject || details.loading} className="rounded-xl bg-white font-bold">
          {detailRequested ? <RotateCw className="size-3" /> : <Sparkles className="size-3" />} {detailRequested ? '重新推荐细节' : '推荐细节'}
        </Button>
        {detailRequested && details.options.map((item) => <button key={item} type="button" onClick={() => updateRecipe('detail', item.slice(0, 80))} className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-bold">{item}</button>)}
        {details.loading && <span className="text-xs">正在想细节…</span>}
      </div>
      {detailRequested && details.error && <p role="alert" className="text-xs text-destructive">{details.error} 可以自己填写配件或动作。</p>}
      {subject.trim() && draft.avatar?.recipe && (
        <GeneratedAvatarPanel
          recipe={draft.avatar.recipe}
          tone={draft.tone}
          adoptedId={draft.avatar.generatedAssetId}
          onAdopt={adopt}
        />
      )}
    </div>
  );
}
