export const systemSchedules = [
    {
        id: 'sys-hala-short',
        name: 'Hala FM Daily Short',
        stationId: '2',
        url: 'https://hala-alrayamedia.radioca.st/;',
        time: '12:57',
        days: [0, 1, 2, 3, 4, 5, 6],
        duration: 600,
        isLocked: true
    },
    {
        id: 'sys-hala-parallel-1145',
        name: 'Hala FM 11:45 PM Parallel',
        stationId: '2',
        url: 'https://hala-alrayamedia.radioca.st/;',
        time: '23:45',
        days: [0, 1, 2, 3, 4, 5, 6],
        duration: 300,
        isLocked: true
    },
    {
        id: 'sys-jhusna-parallel-1145',
        name: 'JHusna FM 11:45 PM Parallel',
        stationId: '18',
        url: 'https://s2.voscast.com:10445/stream',
        time: '23:45',
        days: [0, 1, 2, 3, 4, 5, 6],
        duration: 300,
        isLocked: true
    },
    {
        id: 'sys-jrtv-parallel-1145',
        name: 'JRTV 11:45 PM Parallel (HLS Fix)',
        stationId: '8',
        url: 'https://jrtv-live.ercdn.net/jrradio/jordanradiovideo.m3u8',
        time: '23:45',
        days: [0, 1, 2, 3, 4, 5, 6],
        duration: 300,
        isLocked: true
    }
];
