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

  if (!session || !groupId) {
    return {
      redirect: {
        destination: '/',
        permanent: false,
      },
    };
  }

  try {
    await joinGroup(session.user.id, groupId as string);
  } catch (e) {
    console.log(e);
  }

  return {
    redirect: {
      destination: '/groups',
      permanent: false,
    },
  };
};
