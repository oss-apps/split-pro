import { type GetServerSideProps } from 'next';

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

  if (!session || !groupId || Array.isArray(groupId)) {
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
