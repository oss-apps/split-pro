import Avatar from 'boring-avatars';
import React, { useState } from 'react';
import {
  AppDrawer,
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerTrigger,
} from '~/components/ui/drawer';
import { Input } from '~/components/ui/input';
import { Button } from '~/components/ui/button';
import { api } from '~/utils/api';
import { useRouter } from 'next/router';

export const CreateGroup: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [groupName, setGroupName] = useState('');

  const createGroup = api.group.create.useMutation(undefined);
  const utils = api.useUtils();

  const router = useRouter();

  const handleSubmit = async () => {
    await createGroup.mutateAsync(
      { name: groupName },
      {
        onSuccess: (data) => {
          setGroupName('');
          utils.group.getAllGroupsWithBalances.refetch().catch(console.error);
          router
            .push(`/groups/${data.id}`)
            .then(() => setDrawerOpen(false))
            .catch(console.error);
        },
      },
    );
  };

  return (
    <>
      <AppDrawer
        open={drawerOpen}
        onOpenChange={(openVal) => {
          if (openVal !== drawerOpen) setDrawerOpen(openVal);
        }}
        trigger={children}
        leftAction="Cancel"
        leftActionOnClick={() => setDrawerOpen(false)}
        title="Create a group"
        className="h-[70vh]"
        actionTitle="Submit"
        shouldCloseOnAction
        actionOnClick={async () => {
          await handleSubmit();
        }}
      >
        <div className="">
          <div className="mt-4 flex items-center gap-4">
            <Avatar
              size={50}
              name={groupName}
              variant="bauhaus"
              // colors={['#ADDFD3', '#EAE3D0', '#DBC4B6', '#FFA5AA', '#EFD5C4']}
              // colors={['#565175', '#538A95', '#67B79E', '#FFB727', '#E4491C']}
              colors={['#80C7B7', '#D9C27E', '#F4B088', '#FFA5AA', '#9D9DD3']}
            />
            <Input
              placeholder="Group name"
              className="py-2 text-lg"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            />
          </div>
          {/* <div className="mx-auto mt-2 flex justify-center gap-4">
            <div className="flex gap-6">
              <Button onClick={handleSubmit}>Submit</Button>
              <Button variant="secondary" onClick={() => setDrawerOpen(false)}>
                Cancel
              </Button>
            </div>
          </div> */}
        </div>
      </AppDrawer>
    </>
  );
};
