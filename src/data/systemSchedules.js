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
        id: 'sys-hala-parallel',
        name: 'Hala FM 8:55 PM Parallel',
        stationId: '2',
        url: 'https://hala-alrayamedia.radioca.st/;',
        time: '20:55',
        days: [0, 1, 2, 3, 4, 5, 6],
        duration: 300,
        isLocked: true
    },
    {
        id: 'sys-jhusna-parallel',
        name: 'JHusna FM 8:55 PM Parallel',
        stationId: '18',
        url: 'https://s2.voscast.com:10445/stream',
        time: '20:55',
        days: [0, 1, 2, 3, 4, 5, 6],
        duration: 300,
        isLocked: true
    },
    {
        id: 'sys-jrtv-parallel',
        name: 'JRTV 8:55 PM Parallel (HLS)',
        stationId: '8',
        url: 'https://jrtv-live.ercdn.net/jrradio/jordanradiovideo.m3u8',
        time: '20:55',
        days: [0, 1, 2, 3, 4, 5, 6],
        duration: 300,
        isLocked: true
    }
];
