'use client';

import { useRouter } from 'next/navigation';
import { ownerApi } from '../../../../../lib/api';
import GymForm from '../../../../../components/GymForm';
import { PageTitle } from '../../../../../components/OwnerUI';
import { useOwner } from '../../../../../components/OwnerContext';

export default function NewGymPage() {
  const router = useRouter();
  const { reloadGyms, selectGym, gyms } = useOwner();

  return (
    <>
      <PageTitle title="Register your gym" subtitle={gyms.length === 0 ? 'Step 1: tell members where you are' : 'Add another location'} />
      <GymForm
        submitLabel="Register gym"
        onSubmit={async (values, photos) => {
          const gym = await ownerApi.createGym(values);
          if (photos.length > 0) {
            try {
              await ownerApi.uploadPhotos(gym.id, photos);
            } catch {
              /* the gym exists; photos can be added from Gym settings */
            }
          }
          await reloadGyms();
          selectGym(gym.id);
          router.push('/owner/plans');
        }}
      />
    </>
  );
}
