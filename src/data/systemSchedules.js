// SYSTEM SCHEDULES - DO NOT DELETE
// These schedules are managed by the server-side recorder.
// Production Schedules for Hala FM and JRTV.

export const systemSchedules = [
    {
        id: 'sys-hala-1257',
        name: 'Hala FM Daily Short',
        stationId: '2',
        url: 'https://hala-alrayamedia.radioca.st/;',
        time: '12:57',
        days: [0, 1, 2, 3, 4, 5, 6],
        duration: 600,
        isLocked: true
    },
    {
        id: 'sys-hala-1900',
        name: 'Hala FM Evening Short',
        stationId: '2',
        url: 'https://hala-alrayamedia.radioca.st/;',
        time: '19:00',
        days: [0, 1, 2, 3, 4, 5, 6],
        duration: 600,
        isLocked: true
    },
    {
        id: 'sys-jrtv-1359',
        name: 'JRTV Afternoon Service',
        stationId: '8',
        url: 'https://jrtv-live.ercdn.net/jrradio/jordanradiovideo.m3u8',
        time: '13:59',
        days: [0, 1, 2, 3, 4, 5, 6],
        duration: 1860, // 31 minutes
        isLocked: true
    },
    {
        id: 'sys-jrtv-2000',
        name: 'JRTV Evening Service',
        stationId: '8',
        url: 'https://jrtv-live.ercdn.net/jrradio/jordanradiovideo.m3u8',
        time: '20:00',
        days: [0, 1, 2, 3, 4, 5, 6],
        duration: 600,
        isLocked: true
    },
    {
        id: 'sys-jrtv-test-2200',
        name: 'JRTV 10:00 PM Test (HLS)',
        stationId: '8',
        url: 'https://jrtv-live.ercdn.net/jrradio/jordanradiovideo.m3u8',
        time: '22:00',
        days: [0, 1, 2, 3, 4, 5, 6],
        duration: 300,
        isLocked: true
    }
];
