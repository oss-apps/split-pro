import { type GetServerSideProps } from 'next';
import { toast } from 'sonner';

import { joinGroup } from '~/server/api/services/splitService';
import { getServerAuthSession } from '~/server/auth';
import type { NextPageWithUser } from '~/types';

const Home: NextPageWithUser = () => <div />;

Home.auth = true;

export default Home;

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerAuthSession(context);
  const {
    query: { groupId },
  } = context;

  if (!session) {
    return {
      redirect: {
        destination: `/auth/signin?callbackUrl=${encodeURIComponent(context.resolvedUrl)}`,
        permanent: false,
      },
    };
  } else if (!groupId || Array.isArray(groupId)) {
    toast.warning('Could not find group');
    return {
      redirect: {
        destination: '/groups',
        permanent: false,
      },
    };
  } else {
    try {
      const { id } = await joinGroup(session.user.id, groupId);
      return {
        redirect: {
          destination: `/groups/${id}`,
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
