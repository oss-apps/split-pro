import { type GetServerSideProps } from 'next';
import { toast } from 'sonner';

import { joinGroup } from '~/server/api/services/splitService';
import { getServerAuthSession } from '~/server/auth';

export default function Home() {
  return <>hello</>;
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerAuthSession(context);
  const {
    query: { groupId },
  } = context;

  if (!session) {
    return {
      redirect: {
        destination: '/',
        permanent: false,
      },
    };
  } else if (!groupId || Array.isArray(groupId)) {
    toast.warning('Could not find group');
    return {
      redirect: {
        destination: '/',
        permanent: false,
      },
    };
  } else {
    try {
      await joinGroup(session.user.id, groupId);
      return {
        redirect: {
          destination: `/groups/${groupId}`,
          permanent: false,
        },
      };
    } catch (e) {
      console.error(e);
      return {
        redirect: {
          destination: '/groups',
          permanent: false,
        },
      };
    }
  }
};
