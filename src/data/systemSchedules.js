// SYSTEM SCHEDULES - DO NOT DELETE
// These schedules are managed by the server-side recorder.
// Testing parallel recording at 12:45 AM Amman time.

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
        id: 'sys-hala-parallel-0045',
        name: 'Hala FM 12:45 AM Parallel',
        stationId: '2',
        url: 'https://hala-alrayamedia.radioca.st/;',
        time: '00:45',
        days: [0, 1, 2, 3, 4, 5, 6],
        duration: 300,
        isLocked: true
    },
    {
        id: 'sys-jhusna-parallel-0045',
        name: 'JHusna FM 12:45 AM Parallel',
        stationId: '18',
        url: 'https://s2.voscast.com:10445/stream',
        time: '00:45',
        days: [0, 1, 2, 3, 4, 5, 6],
        duration: 300,
        isLocked: true
    },
    {
        id: 'sys-jrtv-parallel-0045',
        name: 'JRTV 12:45 AM Parallel (HLS Fix)',
        stationId: '8',
        url: 'https://jrtv-live.ercdn.net/jrradio/jordanradiovideo.m3u8',
        time: '00:45',
        days: [0, 1, 2, 3, 4, 5, 6],
        duration: 300,
        isLocked: true
    }
];
