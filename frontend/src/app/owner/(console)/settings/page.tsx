'use client';

import React, { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { ownerApi } from '../../../../lib/api';
import GymForm from '../../../../components/GymForm';
import { PageTitle } from '../../../../components/OwnerUI';
import { useOwner } from '../../../../components/OwnerContext';

export default function SettingsPage() {
  const { gym, reloadGyms } = useOwner();
  const [saved, setSaved] = useState(false);

  if (!gym) return null;

  return (
    <>
      <PageTitle title="Gym settings" subtitle={gym.name} />
      {saved && <div className="p-3 rounded-lg bg-[#31C46C]/10 border border-[#31C46C]/30 text-[#31C46C] text-xs flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Saved</div>}
      <GymForm
        key={gym.id}
        initial={gym}
        allowStatus
        existingPhotos={gym.photos}
        submitLabel="Save changes"
        onDeletePhoto={async (photoId) => {
          await ownerApi.deletePhoto(gym.id, photoId);
          await reloadGyms();
        }}
        onSubmit={async (values, photos) => {
          setSaved(false);
          await ownerApi.updateGym(gym.id, values);
          if (photos.length > 0) await ownerApi.uploadPhotos(gym.id, photos);
          await reloadGyms();
          setSaved(true);
        }}
      />
    </>
  );
}
