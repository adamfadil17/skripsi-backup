// Dummy data that matches the Prisma schema structure
export const dummyData = {
  workspace: {
    id: 'workspace-1',
    name: 'Workspace Name',
    emoji: '💼',
    coverImage: null,
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01'),
  },

  conversation: {
    id: 'conversation-1',
    workspaceId: 'workspace-1',
    lastMessageAt: new Date(),
  },

  currentUser: {
    id: 'user-1',
    name: 'Adam George',
    email: 'adam@example.com',
    image: '/placeholder.svg?height=40&width=40',
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01'),
  },

  members: [
    {
      id: 'user-1',
      name: 'Adam George',
      email: 'adam@example.com',
      image: '/placeholder.svg?height=40&width=40',
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-01'),
    },
    {
      id: 'user-2',
      name: 'Jacob Steven',
      email: 'jacob@example.com',
      image: '/placeholder.svg?height=40&width=40',
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-01'),
    },
    {
      id: 'user-3',
      name: 'Ariana Leux',
      email: 'ariana@example.com',
      image: '/placeholder.svg?height=40&width=40',
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-01'),
    },
    {
      id: 'user-4',
      name: 'Sarah Johnson',
      email: 'sarah@example.com',
      image: '/placeholder.svg?height=40&width=40',
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-01'),
    },
    {
      id: 'user-5',
      name: 'Michael Brown',
      email: 'michael@example.com',
      image: '/placeholder.svg?height=40&width=40',
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-01'),
    },
    {
      id: 'user-6',
      name: 'Emily Davis',
      email: 'emily@example.com',
      image: '/placeholder.svg?height=40&width=40',
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-01'),
    },
  ],

  unreadCount: 9,

  messages: [
    {
      id: 'message-1',
      body: 'Hi everyone! I am looking for a suitable plan for the small team size and I expect to get your recommendation and suggestions.',
      image: null,
      conversationId: 'conversation-1',
      senderId: 'user-1',
      createdAt: new Date('2023-04-19T11:46:00'),
      seenIds: ['user-1', 'user-2', 'user-3'],
      seenBy: [
        { id: 'user-1', name: 'Adam George' },
        { id: 'user-2', name: 'Jacob Steven' },
        { id: 'user-3', name: 'Ariana Leux' },
      ],
      sender: {
        id: 'user-1',
        name: 'Adam George',
        image: '/placeholder.svg?height=40&width=40',
      },
    },
    {
      id: 'message-2',
      body: 'Nice to meet you',
      image: null,
      conversationId: 'conversation-1',
      senderId: 'user-2',
      createdAt: new Date('2023-04-19T11:49:00'),
      seenIds: ['user-1', 'user-2'],
      seenBy: [
        { id: 'user-1', name: 'Adam George' },
        { id: 'user-2', name: 'Jacob Steven' },
      ],
      sender: {
        id: 'user-2',
        name: 'Jacob Steven',
        image: '/placeholder.svg?height=40&width=40',
      },
    },
    {
      id: 'message-3',
      body: 'Nice to meet you too, Jacob!',
      image: null,
      conversationId: 'conversation-1',
      senderId: 'user-1',
      createdAt: new Date('2023-04-19T11:46:00'),
      // This message has been seen by all members
      seenIds: ['user-1', 'user-2', 'user-3', 'user-4', 'user-5', 'user-6'],
      seenBy: [
        { id: 'user-1', name: 'Adam George' },
        { id: 'user-2', name: 'Jacob Steven' },
        { id: 'user-3', name: 'Ariana Leux' },
        { id: 'user-4', name: 'Sarah Johnson' },
        { id: 'user-5', name: 'Michael Brown' },
        { id: 'user-6', name: 'Emily Davis' },
      ],
      sender: {
        id: 'user-1',
        name: 'Adam George',
        image: '/placeholder.svg?height=40&width=40',
      },
    },
    {
      id: 'message-4',
      body: 'Nice to meet yo, Adam',
      image: null,
      conversationId: 'conversation-1',
      senderId: 'user-3',
      createdAt: new Date('2023-04-19T11:49:00'),
      seenIds: ['user-1', 'user-3'],
      seenBy: [
        { id: 'user-1', name: 'Adam George' },
        { id: 'user-3', name: 'Ariana Leux' },
      ],
      sender: {
        id: 'user-3',
        name: 'Ariana Leux',
        image: '/placeholder.svg?height=40&width=40',
      },
    },
  ],
};
