/* global document, location */
// Builds the "Viewly" showcase page: ?view=home|watch&lang=en|vi (store screenshots only).
(() => {
  const params = new URLSearchParams(location.search);
  const vi = params.get('lang') === 'vi';
  const view = params.get('view') === 'watch' ? 'watch' : 'home';
  document.documentElement.lang = vi ? 'vi' : 'en';

  // Colourful CSS "pictures" standing in for thumbnails (no real images).
  const SCENES = [
    'radial-gradient(circle at 50% 62%,#ffe08a 0 9%,#ffb36b00 10%),linear-gradient(180deg,#1d1b4b 0%,#6b3fa0 38%,#ff6f61 64%,#ffb36b 72%,#23395d 73%,#0f1f3a 100%)',
    'linear-gradient(160deg,transparent 58%,#1b2a4a 58%),linear-gradient(205deg,transparent 52%,#2b3f6c 52%),radial-gradient(circle at 74% 26%,#fffbe6 0 4%,transparent 5%),linear-gradient(180deg,#0b1d3a,#4b6cb7)',
    'radial-gradient(120% 70% at 50% 100%,#f8f9ff 0 30%,transparent 31%),radial-gradient(circle at 30% 40%,#ffd36b 0 8%,transparent 9%),linear-gradient(180deg,#ff9a76,#ffd1a6 60%,#fff2e0)',
    'radial-gradient(circle at 60% 55%,#f5e6d3 0 18%,#c08552 19% 23%,transparent 24%),radial-gradient(circle at 60% 55%,#3e2723 0 26%,transparent 27%),linear-gradient(135deg,#d7a86e,#8d5524)',
    'linear-gradient(180deg,transparent 62%,#ff2fb3 62% 63%,transparent 63%),repeating-linear-gradient(90deg,transparent 0 38px,#ff2fb366 38px 40px),radial-gradient(circle at 50% 60%,#ffb3e6 0 12%,#ff2fb3 13% 16%,transparent 17%),linear-gradient(180deg,#12052f,#5b1a7a 60%,#12052f)',
    'radial-gradient(60% 50% at 30% 30%,#c4f1be,transparent),radial-gradient(70% 60% at 80% 70%,#2d6a4f,transparent),linear-gradient(135deg,#40916c,#081c15)',
    'radial-gradient(circle at 50% 48%,#fff4dc 0 20%,#f2c46d 21% 25%,transparent 26%),radial-gradient(circle at 50% 48%,#7f1d1d 0 31%,transparent 32%),linear-gradient(135deg,#3b1d12,#b45309)',
    'linear-gradient(180deg,transparent 70%,#0a1a1a 70%),radial-gradient(80% 40% at 40% 30%,#34d39988,transparent 70%),radial-gradient(70% 35% at 70% 40%,#a78bfa77,transparent 70%),linear-gradient(180deg,#020617,#0f2a3d)',
  ];
  const AVATARS = ['#f59e0b', '#38bdf8', '#34d399', '#d97706', '#ec4899', '#22c55e', '#ef4444', '#8b5cf6'];
  const VIDEOS = [
    [
      'Night drive through Tokyo — 4K city lights',
      'Lái xe đêm qua Tokyo — ánh đèn thành phố 4K',
      'Lumen Studio',
      '2.1M views · 3 days ago',
      '2,1 Tr lượt xem · 3 ngày trước',
      '18:24',
    ],
    [
      'Lo-fi beats to study and relax',
      'Nhạc lo-fi để học và thư giãn',
      'Chill Corner',
      '8.1M views · 1 year ago',
      '8,1 Tr lượt xem · 1 năm trước',
      '1:02:11',
    ],
    [
      'Sunrise above the clouds — drone flight',
      'Bình minh trên biển mây — bay flycam',
      'Blue Planet',
      '940K views · 2 weeks ago',
      '940 N lượt xem · 2 tuần trước',
      '12:08',
    ],
    [
      'Making the perfect espresso at home',
      'Pha ly espresso hoàn hảo tại nhà',
      'Bean Lab',
      '1.1M views · 5 days ago',
      '1,1 Tr lượt xem · 5 ngày trước',
      '9:41',
    ],
    [
      'Synthwave mix for late-night coding',
      'Nhạc synthwave cho những đêm lập trình',
      'Neon Arcade',
      '3.4M views · 8 months ago',
      '3,4 Tr lượt xem · 8 tháng trước',
      '2:03:15',
    ],
    [
      'Into the green forest: 24 hours of rain',
      'Vào rừng xanh: 24 giờ nghe mưa',
      'Wild Paths',
      '620K views · 1 month ago',
      '620 N lượt xem · 1 tháng trước',
      '24:00:00',
    ],
    [
      'The art of slow cooking: pho from scratch',
      'Nấu phở từ đầu: nghệ thuật hầm chậm',
      'Kitchen Notes',
      '2.7M views · 3 weeks ago',
      '2,7 Tr lượt xem · 3 tuần trước',
      '21:37',
    ],
    [
      'Northern lights over Iceland',
      'Cực quang trên bầu trời Iceland',
      'Aurora Hunters',
      '5.2M views · 2 years ago',
      '5,2 Tr lượt xem · 2 năm trước',
      '15:02',
    ],
  ];
  const T = (en, viText) => (vi ? viText : en);

  const h = (tag, attrs = {}, ...kids) => {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class') el.className = v;
      else if (k === 'style') el.setAttribute('style', v);
      else el.setAttribute(k, v);
    }
    for (const kid of kids) if (kid != null) el.append(kid);
    return el;
  };

  const thumb = (i, progress) =>
    h(
      'ytd-thumbnail',
      {},
      h('span', { id: 'thumbnail', style: `--scene:${SCENES[i % SCENES.length]}` }),
      h('span', { class: 'duration' }, VIDEOS[i % VIDEOS.length][5]),
      progress
        ? h(
            'ytd-thumbnail-overlay-resume-playback-renderer',
            {},
            h('div', { id: 'progress', style: `width:${progress}%` }),
          )
        : null,
    );

  document.getElementById('search-text').textContent = T('Search', 'Tìm kiếm');
  const root = document.getElementById('view');

  if (view === 'home') {
    const guide = h('div', { id: 'contentContainer' });
    const entries = [
      [T('Home', 'Trang chủ'), true],
      [T('Subscriptions', 'Kênh đăng ký')],
      [T('You', 'Bạn')],
      [T('History', 'Video đã xem')],
      [T('Watch later', 'Xem sau')],
    ];
    for (const [label, active] of entries)
      guide.append(h('div', { class: `guide-entry${active ? ' active' : ''}` }, h('i'), label));
    guide.append(
      h('div', { class: 'guide-sep' }),
      h('div', { class: 'guide-title' }, T('Subscriptions', 'Kênh đăng ký')),
    );
    for (let i = 0; i < 5; i++) {
      guide.append(
        h(
          'div',
          { class: 'guide-entry' },
          h('span', { class: 'sub-dot', style: `background:${AVATARS[i]}` }),
          VIDEOS[i][2],
        ),
      );
    }
    root.append(h('tp-yt-app-drawer', { id: 'guide' }, guide));
    const chips = h('div', { id: 'chips-wrapper' });
    const chipLabels = vi
      ? ['Tất cả', 'Âm nhạc', 'Trực tiếp', 'Du lịch', 'Nấu ăn', 'Trò chơi', 'Podcast', 'Mới tải lên']
      : ['All', 'Music', 'Live', 'Travel', 'Cooking', 'Gaming', 'Podcasts', 'Recently uploaded'];
    chipLabels.forEach((c, i) => chips.append(h('span', { class: `chip${i === 0 ? ' active' : ''}` }, c)));
    const grid = h('ytd-rich-grid-renderer');
    VIDEOS.forEach((v, i) => {
      grid.append(
        h(
          'ytd-rich-item-renderer',
          {},
          thumb(i, i === 2 ? 64 : i === 5 ? 30 : 0),
          h(
            'div',
            { class: 'details' },
            h('span', { class: 'ch-avatar', style: `background:${AVATARS[i]}` }),
            h(
              'div',
              {},
              h('div', { class: 'v-title' }, T(v[0], v[1])),
              h('div', { class: 'v-meta' }, v[2], h('br'), T(v[3], v[4])),
            ),
          ),
        ),
      );
    });
    root.append(h('div', { class: 'home' }, h('ytd-feed-filter-chip-bar-renderer', {}, chips), grid));
  } else {
    const video = h('video', { src: 'showcase.webm', muted: '', loop: '', playsinline: '' });
    video.muted = true;
    const player = h(
      'div',
      { id: 'ytd-player' },
      h(
        'div',
        { id: 'movie_player' },
        video,
        h(
          'div',
          { class: 'ytp-chrome-bottom' },
          h(
            'div',
            { class: 'ytp-progress-bar' },
            h('div', { class: 'ytp-play-progress' }),
            h('div', { class: 'ytp-scrubber-button' }),
          ),
          h(
            'div',
            { class: 'ytp-row' },
            h('i'),
            h('i'),
            h('span', { class: 'grow' }, '7:42 / 18:24'),
            h('i'),
            h('i'),
            h('i'),
          ),
        ),
      ),
    );
    const v = VIDEOS[0];
    const primary = h(
      'div',
      { id: 'primary' },
      player,
      h('h1', { class: 'w-title', id: 'title' }, T(v[0], v[1])),
      h(
        'div',
        { class: 'w-meta' },
        h('span', { class: 'ch-avatar', style: `background:${AVATARS[0]}` }),
        h('span', { class: 'who' }, h('b', {}, v[2]), h('span', {}, T('1.2M subscribers', '1,2 Tr người đăng ký'))),
        h('span', { class: 'btn sub' }, T('Subscribe', 'Đăng ký')),
        h('span', { class: 'btn' }, '👍 48K'),
        h('span', { class: 'btn' }, T('Share', 'Chia sẻ')),
        h('span', { class: 'btn' }, T('Save', 'Lưu')),
      ),
      h(
        'div',
        { id: 'description' },
        h('b', {}, T(v[3], v[4])),
        ' ',
        h('a', {}, '#citylights #nightdrive'),
        h('br'),
        T(
          'Recorded on a rainy night with the whole city glowing. Headphones on, lights off.',
          'Quay vào một đêm mưa khi cả thành phố lên đèn. Đeo tai nghe, tắt đèn và thưởng thức.',
        ),
      ),
    );
    const secondary = h('div', { id: 'secondary' });
    VIDEOS.slice(1, 7).forEach((rv, i) => {
      secondary.append(
        h(
          'ytd-compact-video-renderer',
          {},
          thumb(i + 1, i === 1 ? 45 : 0),
          h(
            'div',
            {},
            h('div', { class: 'v-title' }, T(rv[0], rv[1])),
            h('div', { class: 'v-meta' }, rv[2], h('br'), T(rv[3], rv[4])),
          ),
        ),
      );
    });
    root.append(h('ytd-watch-flexy', {}, h('div', { id: 'columns' }, primary, secondary)));
  }
})();
