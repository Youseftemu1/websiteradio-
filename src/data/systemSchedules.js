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
        id: 'sys-hala-6pm',
        name: 'Hala FM 6:00 PM',
        stationId: '2',
        url: 'https://hala-alrayamedia.radioca.st/;',
        time: '18:00',
        days: [0, 1, 2, 3, 4, 5, 6],
        duration: 600,
        isLocked: true
    },
    {
        id: 'sys-jrtv-7pm',
        name: 'JRTV 7:00 PM',
        stationId: '8',
        url: 'https://jrtv-live.ercdn.net/jrradio/jordanradiovideo.m3u8',
        time: '19:00',
        days: [0, 1, 2, 3, 4, 5, 6],
        duration: 600,
        isLocked: true
    }
];
