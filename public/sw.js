if (!self.define) {
  let e,
    i = {};
  const a = (a, s) => (
    (a = new URL(a + '.js', s).href),
    i[a] ||
      new Promise((i) => {
        if ('document' in self) {
          const e = document.createElement('script');
          (e.src = a), (e.onload = i), document.head.appendChild(e);
        } else (e = a), importScripts(a), i();
      }).then(() => {
        let e = i[a];
        if (!e) throw new Error(`Module ${a} didn’t register its module`);
        return e;
      })
  );
  self.define = (s, n) => {
    const c = e || ('document' in self ? document.currentScript.src : '') || location.href;
    if (i[c]) return;
    let o = {};
    const r = (e) => a(e, c),
      d = { module: { uri: c }, exports: o, require: r };
    i[c] = Promise.all(s.map((e) => d[e] || r(e))).then((e) => (n(...e), o));
  };
}
define(['./workbox-2e6be583'], function (e) {
  'use strict';
  importScripts(),
    self.skipWaiting(),
    e.clientsClaim(),
    e.precacheAndRoute(
      [
        { url: '/Desktop.webp', revision: '013aaef85864e005318311cba5a9d69e' },
        { url: '/_next/static/chunks/147-87ec53f1e712fe1f.js', revision: '87ec53f1e712fe1f' },
        { url: '/_next/static/chunks/256-ccc9a2a458c6837f.js', revision: 'ccc9a2a458c6837f' },
        { url: '/_next/static/chunks/269-bd1264f9a74a1082.js', revision: 'bd1264f9a74a1082' },
        { url: '/_next/static/chunks/293-9b87a02c5ab2a5cf.js', revision: '9b87a02c5ab2a5cf' },
        { url: '/_next/static/chunks/320-608b5a36afd5783e.js', revision: '608b5a36afd5783e' },
        { url: '/_next/static/chunks/403-88315c2dccd43f80.js', revision: '88315c2dccd43f80' },
        { url: '/_next/static/chunks/469-b28400ce8e3d10b5.js', revision: 'b28400ce8e3d10b5' },
        { url: '/_next/static/chunks/484-4f2a826d020c8abd.js', revision: '4f2a826d020c8abd' },
        { url: '/_next/static/chunks/629-4be2f6211c96e22d.js', revision: '4be2f6211c96e22d' },
        { url: '/_next/static/chunks/674-32d8f1d6ac3ecabd.js', revision: '32d8f1d6ac3ecabd' },
        { url: '/_next/static/chunks/764-1475a69a71f07de3.js', revision: '1475a69a71f07de3' },
        { url: '/_next/static/chunks/782-d3bf5ecb4a3932bd.js', revision: 'd3bf5ecb4a3932bd' },
        { url: '/_next/static/chunks/822-5112d335acc57f78.js', revision: '5112d335acc57f78' },
        { url: '/_next/static/chunks/946-70231cc63932dfba.js', revision: '70231cc63932dfba' },
        { url: '/_next/static/chunks/framework-49ac320dc6ce0e7a.js', revision: '49ac320dc6ce0e7a' },
        { url: '/_next/static/chunks/main-10d2924a1fd80a5e.js', revision: '10d2924a1fd80a5e' },
        {
          url: '/_next/static/chunks/pages/_app-2dce32e69dc7933b.js',
          revision: '2dce32e69dc7933b',
        },
        {
          url: '/_next/static/chunks/pages/_error-7b3af279a8dc815e.js',
          revision: '7b3af279a8dc815e',
        },
        {
          url: '/_next/static/chunks/pages/account-b7cb19fa5cc71530.js',
          revision: 'b7cb19fa5cc71530',
        },
        {
          url: '/_next/static/chunks/pages/activity-dd96c17c6c6baaf9.js',
          revision: 'dd96c17c6c6baaf9',
        },
        { url: '/_next/static/chunks/pages/add-0a04547623fefc7b.js', revision: '0a04547623fefc7b' },
        {
          url: '/_next/static/chunks/pages/auth/signin-c5705fa4ce013e0d.js',
          revision: 'c5705fa4ce013e0d',
        },
        {
          url: '/_next/static/chunks/pages/balances-4097bfdbf0d427b4.js',
          revision: '4097bfdbf0d427b4',
        },
        {
          url: '/_next/static/chunks/pages/balances/%5BfriendId%5D-46f8e131200304e6.js',
          revision: '46f8e131200304e6',
        },
        {
          url: '/_next/static/chunks/pages/balances/%5BfriendId%5D/expenses/%5BexpenseId%5D-27708443b9af5a14.js',
          revision: '27708443b9af5a14',
        },
        {
          url: '/_next/static/chunks/pages/balances/expenses-77a97773ba5a5fc9.js',
          revision: '77a97773ba5a5fc9',
        },
        {
          url: '/_next/static/chunks/pages/expenses/%5BexpenseId%5D-d7e62be2306682bf.js',
          revision: 'd7e62be2306682bf',
        },
        {
          url: '/_next/static/chunks/pages/groups-fdd81767af415b98.js',
          revision: 'fdd81767af415b98',
        },
        {
          url: '/_next/static/chunks/pages/groups/%5BgroupId%5D-33ab3a593618925e.js',
          revision: '33ab3a593618925e',
        },
        {
          url: '/_next/static/chunks/pages/groups/%5BgroupId%5D/expenses/%5BexpenseId%5D-9c15af08c92e65eb.js',
          revision: '9c15af08c92e65eb',
        },
        {
          url: '/_next/static/chunks/pages/index-60ae8cd9edb607c9.js',
          revision: '60ae8cd9edb607c9',
        },
        {
          url: '/_next/static/chunks/pages/join-group-103c390968adbd15.js',
          revision: '103c390968adbd15',
        },
        {
          url: '/_next/static/chunks/pages/privacy-cf452ace4c6902f6.js',
          revision: 'cf452ace4c6902f6',
        },
        {
          url: '/_next/static/chunks/pages/terms-1ead294f2a93f815.js',
          revision: '1ead294f2a93f815',
        },
        {
          url: '/_next/static/chunks/polyfills-c67a75d1b6f99dc8.js',
          revision: '837c0df77fd5009c9e46d446188ecfd0',
        },
        { url: '/_next/static/chunks/webpack-e03f3c8a9de39585.js', revision: 'e03f3c8a9de39585' },
        { url: '/_next/static/css/e1a6cb755378dd52.css', revision: 'e1a6cb755378dd52' },
        {
          url: '/_next/static/media/10939feefdad71be-s.woff2',
          revision: '72b3ae37567ee5efdf2254b657c36ba9',
        },
        {
          url: '/_next/static/media/20b8b8f6f47c1e10-s.woff2',
          revision: '7def222d1a45cb1cb7d8c3ae675dbdcc',
        },
        {
          url: '/_next/static/media/370d1cc320ec5619-s.woff2',
          revision: 'a6ff41d10fa89e7f8fec937c243d7428',
        },
        {
          url: '/_next/static/media/3828f203592f7603-s.woff2',
          revision: 'e9fd398a43c9e51f9ee14e757eaf95d9',
        },
        {
          url: '/_next/static/media/591327bf3b62a611-s.woff2',
          revision: '0ed299a4bb5262e17e2145783b2c18f1',
        },
        {
          url: '/_next/static/media/7777133e901cd5ed-s.p.woff2',
          revision: 'a09f2fccfee35b7247b08a1a266f0328',
        },
        {
          url: '/_next/static/media/839135d04a097cea-s.woff2',
          revision: '79e6e81d255edac7e8627c7e16baccf5',
        },
        {
          url: '/_next/static/media/87c72f23c47212b9-s.woff2',
          revision: '790d0c8dbcd491d29d58f1369c199d40',
        },
        {
          url: '/_next/static/media/916d3686010a8de2-s.p.woff2',
          revision: '9212f6f9860f9fc6c69b02fedf6db8c3',
        },
        {
          url: '/_next/static/media/953974ac5e9ff354-s.woff2',
          revision: '6731e1ba3788bda094c89ee8fc131aef',
        },
        {
          url: '/_next/static/media/9a881e2ac07d406b-s.p.woff2',
          revision: '25b0e113ca7cce3770d542736db26368',
        },
        {
          url: '/_next/static/media/ac614beb32f7a7c2-s.woff2',
          revision: '20f5992a9c019fb146a38e1cc0c101d3',
        },
        {
          url: '/_next/static/media/aefc8ad6d88b3354-s.woff2',
          revision: '6a4298fc0390ec22c52f618daa0e82bf',
        },
        {
          url: '/_next/static/media/c04551857776278f-s.p.woff2',
          revision: '8d91ec1ca2d8b56640a47117e313a3e9',
        },
        {
          url: '/_next/static/media/d36a2a2bb416f59e-s.p.woff2',
          revision: 'a7f7eebec745ef48ccf7a3d08c66d84a',
        },
        {
          url: '/_next/static/media/d869208648ca5469-s.p.woff2',
          revision: '72993dddf88a63e8f226656f7de88e57',
        },
        {
          url: '/_next/static/media/e025c64520263018-s.woff2',
          revision: 'dc820d9f0f62811268590ff631f36be9',
        },
        {
          url: '/_next/static/media/f93b79c1ea023ab6-s.woff2',
          revision: '96b6d54684daa94742f7bfd72a981213',
        },
        {
          url: '/_next/static/thiS2Z6a8nQ6vugavSPD7/_buildManifest.js',
          revision: '4b3f2027ea3e4a2e3ae1ea353f6e23ed',
        },
        {
          url: '/_next/static/thiS2Z6a8nQ6vugavSPD7/_ssgManifest.js',
          revision: 'b6652df95db52feb4daf4eca35380933',
        },
        { url: '/add_expense.svg', revision: '7fdcbf05378a944aaf1360306cc8190e' },
        { url: '/empty_img.svg', revision: '1ca0ba9508c6a056a269f0c6a74a19dc' },
        { url: '/favicon.ico', revision: 'e3dcbd17e369df2cdea9ef09fe5ddcc7' },
        { url: '/group.svg', revision: '257863ce59141a0bced069bfe4daefd7' },
        { url: '/hero.webp', revision: '8f93dd2b0927b93358ae4386046850e3' },
        { url: '/icons/android-chrome-192x192.png', revision: 'c305638d70dfac32791b07ded6cd0fda' },
        { url: '/icons/android-chrome-512x512.png', revision: '99d08e5a381118e2bf5593d3b7f523e9' },
        {
          url: '/icons/android/android-launchericon-144-144.png',
          revision: '4a576b1d2746c9dfc63ac88c65000f26',
        },
        {
          url: '/icons/android/android-launchericon-192-192.png',
          revision: '855f87568d4f2a9614da3df69574cc5b',
        },
        {
          url: '/icons/android/android-launchericon-48-48.png',
          revision: '81d46922a00b45053b483fc02396b943',
        },
        {
          url: '/icons/android/android-launchericon-512-512.png',
          revision: 'f25065f4bf7f9c7e4ef9c9d8bdf60ff6',
        },
        {
          url: '/icons/android/android-launchericon-72-72.png',
          revision: '951f81f186aa1e9e04a6ad6c82599360',
        },
        {
          url: '/icons/android/android-launchericon-96-96.png',
          revision: 'a32fa8b78621630dea2c88bbae2911c6',
        },
        { url: '/icons/apple-touch-icon.png', revision: 'bcfcce022781c77ddd051b4b7c3cb9c1' },
        { url: '/icons/favicon-16x16.png', revision: 'd777648be081d90e69c30bade0a6fc7a' },
        { url: '/icons/favicon-32x32.png', revision: 'fa080b4c0b8d2ff7847eb2c5a92b2814' },
        { url: '/icons/icons.json', revision: '5dbbc3fe59816e65ba28e355a58ea45c' },
        { url: '/icons/ios/100.png', revision: 'fa12116e7d45b99a71b0ae726143f9a3' },
        { url: '/icons/ios/1024.png', revision: 'e3a9208ba306ecd86cd85996cfed80b3' },
        { url: '/icons/ios/114.png', revision: '94502fb444274781e75d6bd1d12d36b6' },
        { url: '/icons/ios/120.png', revision: '256185b672a6c8ceeaaa941b8e1367ee' },
        { url: '/icons/ios/128.png', revision: '3d5d4248a4d055aed456e4c99099f829' },
        { url: '/icons/ios/144.png', revision: '4a576b1d2746c9dfc63ac88c65000f26' },
        { url: '/icons/ios/152.png', revision: '6714638edaa3ae5b80e2cd2cd323edae' },
        { url: '/icons/ios/16.png', revision: '022bd1befcb2d633f0e7193acf84ab2c' },
        { url: '/icons/ios/167.png', revision: '94005c9778df7428e93006573e8fc402' },
        { url: '/icons/ios/180.png', revision: '26b01daf04c921835948ba669c275349' },
        { url: '/icons/ios/192.png', revision: '855f87568d4f2a9614da3df69574cc5b' },
        { url: '/icons/ios/20.png', revision: '80b930898a28ee5e980f0e5cb7dc2db3' },
        { url: '/icons/ios/256.png', revision: '4fcfce15cd29e7be9cbcf96df8b1abb7' },
        { url: '/icons/ios/29.png', revision: '91e7f1a0788aa523730e4a825db561b9' },
        { url: '/icons/ios/32.png', revision: '377dd3f67fd61f1f0250cfb9d0b57ba7' },
        { url: '/icons/ios/40.png', revision: '4e22bf687216e1fed27f9bb2b504a515' },
        { url: '/icons/ios/50.png', revision: '0d45247b09312838e94c8fd39a59ef4a' },
        { url: '/icons/ios/512.png', revision: 'f25065f4bf7f9c7e4ef9c9d8bdf60ff6' },
        { url: '/icons/ios/57.png', revision: 'a97bd4ea15b0a1184ebb38a664a4d177' },
        { url: '/icons/ios/58.png', revision: 'd9c28800bebc30edaea970d928b414ec' },
        { url: '/icons/ios/60.png', revision: 'a7d78b43f0652e87f6bd08f0b835509f' },
        { url: '/icons/ios/64.png', revision: '04e42560e497ec95c41743c896bb065b' },
        { url: '/icons/ios/72.png', revision: '951f81f186aa1e9e04a6ad6c82599360' },
        { url: '/icons/ios/76.png', revision: '151a882c3eb156fc05eb38d422d4c80f' },
        { url: '/icons/ios/80.png', revision: 'ddce1d6b14f6c2f661774b50eb98c611' },
        { url: '/icons/ios/87.png', revision: '7211abff53eb735a9cca06cb11c6de14' },
        {
          url: '/icons/windows11/LargeTile.scale-100.png',
          revision: 'd5bd52254679d8985cae1498575abb85',
        },
        {
          url: '/icons/windows11/LargeTile.scale-125.png',
          revision: 'e4cea474a157a93aa90e365fb2309b57',
        },
        {
          url: '/icons/windows11/LargeTile.scale-150.png',
          revision: 'c786850ab3cd0635bad3e2c0d40172d6',
        },
        {
          url: '/icons/windows11/LargeTile.scale-200.png',
          revision: '3be23c968aa961e9599c61f6a6f80ed5',
        },
        {
          url: '/icons/windows11/LargeTile.scale-400.png',
          revision: '826b67247744af97cf4c0e3d1afcd2ec',
        },
        {
          url: '/icons/windows11/SmallTile.scale-100.png',
          revision: 'b8b6b50bef75626eb6668d84fdec54f9',
        },
        {
          url: '/icons/windows11/SmallTile.scale-125.png',
          revision: 'd5d111c462d8d900503f07d53458fc65',
        },
        {
          url: '/icons/windows11/SmallTile.scale-150.png',
          revision: '132dfe96dd7c66d35b6a793d470ebd2e',
        },
        {
          url: '/icons/windows11/SmallTile.scale-200.png',
          revision: '0c39c935b8bd24f2e05eb56c40515a11',
        },
        {
          url: '/icons/windows11/SmallTile.scale-400.png',
          revision: 'f9bcce77e568871fb5020650dbeadfe0',
        },
        {
          url: '/icons/windows11/SplashScreen.scale-100.png',
          revision: '2df404ffd63bab899fb72a3777fed2a9',
        },
        {
          url: '/icons/windows11/SplashScreen.scale-125.png',
          revision: '5b9c06c93affb41675510f7f42d9eb59',
        },
        {
          url: '/icons/windows11/SplashScreen.scale-150.png',
          revision: '1b261d1a15176dd13baf9c428345d09a',
        },
        {
          url: '/icons/windows11/SplashScreen.scale-200.png',
          revision: 'b008f32a9d7362ccfcc34207f82fc7b5',
        },
        {
          url: '/icons/windows11/SplashScreen.scale-400.png',
          revision: '83104ccc8a3830fdf994236d2e93baaf',
        },
        {
          url: '/icons/windows11/Square150x150Logo.scale-100.png',
          revision: '85ea769403ee2e1e92bc0f864f92ffed',
        },
        {
          url: '/icons/windows11/Square150x150Logo.scale-125.png',
          revision: '500671f96f2bde72e6ca9689c7907130',
        },
        {
          url: '/icons/windows11/Square150x150Logo.scale-150.png',
          revision: 'bcb122155da153c3c6a6e95e6efcd3ed',
        },
        {
          url: '/icons/windows11/Square150x150Logo.scale-200.png',
          revision: 'fc7e779ba0cff678a9b526003d9281e1',
        },
        {
          url: '/icons/windows11/Square150x150Logo.scale-400.png',
          revision: 'fd704147a3977268fc3db720672b8b06',
        },
        {
          url: '/icons/windows11/Square44x44Logo.altform-lightunplated_targetsize-16.png',
          revision: '022bd1befcb2d633f0e7193acf84ab2c',
        },
        {
          url: '/icons/windows11/Square44x44Logo.altform-lightunplated_targetsize-20.png',
          revision: '80b930898a28ee5e980f0e5cb7dc2db3',
        },
        {
          url: '/icons/windows11/Square44x44Logo.altform-lightunplated_targetsize-24.png',
          revision: 'e74ec4fd6e3f4ee71ef5ec2d24a66e5e',
        },
        {
          url: '/icons/windows11/Square44x44Logo.altform-lightunplated_targetsize-256.png',
          revision: '4fcfce15cd29e7be9cbcf96df8b1abb7',
        },
        {
          url: '/icons/windows11/Square44x44Logo.altform-lightunplated_targetsize-30.png',
          revision: '7cd621260d991b63e84592f811acda8b',
        },
        {
          url: '/icons/windows11/Square44x44Logo.altform-lightunplated_targetsize-32.png',
          revision: '377dd3f67fd61f1f0250cfb9d0b57ba7',
        },
        {
          url: '/icons/windows11/Square44x44Logo.altform-lightunplated_targetsize-36.png',
          revision: 'a129be4fe59f36ad180e4379c6e47d5f',
        },
        {
          url: '/icons/windows11/Square44x44Logo.altform-lightunplated_targetsize-40.png',
          revision: '4e22bf687216e1fed27f9bb2b504a515',
        },
        {
          url: '/icons/windows11/Square44x44Logo.altform-lightunplated_targetsize-44.png',
          revision: '099233a068b2a053b23a97bab7ca6e63',
        },
        {
          url: '/icons/windows11/Square44x44Logo.altform-lightunplated_targetsize-48.png',
          revision: '81d46922a00b45053b483fc02396b943',
        },
        {
          url: '/icons/windows11/Square44x44Logo.altform-lightunplated_targetsize-60.png',
          revision: 'a7d78b43f0652e87f6bd08f0b835509f',
        },
        {
          url: '/icons/windows11/Square44x44Logo.altform-lightunplated_targetsize-64.png',
          revision: '04e42560e497ec95c41743c896bb065b',
        },
        {
          url: '/icons/windows11/Square44x44Logo.altform-lightunplated_targetsize-72.png',
          revision: '951f81f186aa1e9e04a6ad6c82599360',
        },
        {
          url: '/icons/windows11/Square44x44Logo.altform-lightunplated_targetsize-80.png',
          revision: 'ddce1d6b14f6c2f661774b50eb98c611',
        },
        {
          url: '/icons/windows11/Square44x44Logo.altform-lightunplated_targetsize-96.png',
          revision: 'a32fa8b78621630dea2c88bbae2911c6',
        },
        {
          url: '/icons/windows11/Square44x44Logo.altform-unplated_targetsize-16.png',
          revision: '022bd1befcb2d633f0e7193acf84ab2c',
        },
        {
          url: '/icons/windows11/Square44x44Logo.altform-unplated_targetsize-20.png',
          revision: '80b930898a28ee5e980f0e5cb7dc2db3',
        },
        {
          url: '/icons/windows11/Square44x44Logo.altform-unplated_targetsize-24.png',
          revision: 'e74ec4fd6e3f4ee71ef5ec2d24a66e5e',
        },
        {
          url: '/icons/windows11/Square44x44Logo.altform-unplated_targetsize-256.png',
          revision: '4fcfce15cd29e7be9cbcf96df8b1abb7',
        },
        {
          url: '/icons/windows11/Square44x44Logo.altform-unplated_targetsize-30.png',
          revision: '7cd621260d991b63e84592f811acda8b',
        },
        {
          url: '/icons/windows11/Square44x44Logo.altform-unplated_targetsize-32.png',
          revision: '377dd3f67fd61f1f0250cfb9d0b57ba7',
        },
        {
          url: '/icons/windows11/Square44x44Logo.altform-unplated_targetsize-36.png',
          revision: 'a129be4fe59f36ad180e4379c6e47d5f',
        },
        {
          url: '/icons/windows11/Square44x44Logo.altform-unplated_targetsize-40.png',
          revision: '4e22bf687216e1fed27f9bb2b504a515',
        },
        {
          url: '/icons/windows11/Square44x44Logo.altform-unplated_targetsize-44.png',
          revision: '099233a068b2a053b23a97bab7ca6e63',
        },
        {
          url: '/icons/windows11/Square44x44Logo.altform-unplated_targetsize-48.png',
          revision: '81d46922a00b45053b483fc02396b943',
        },
        {
          url: '/icons/windows11/Square44x44Logo.altform-unplated_targetsize-60.png',
          revision: 'a7d78b43f0652e87f6bd08f0b835509f',
        },
        {
          url: '/icons/windows11/Square44x44Logo.altform-unplated_targetsize-64.png',
          revision: '04e42560e497ec95c41743c896bb065b',
        },
        {
          url: '/icons/windows11/Square44x44Logo.altform-unplated_targetsize-72.png',
          revision: '951f81f186aa1e9e04a6ad6c82599360',
        },
        {
          url: '/icons/windows11/Square44x44Logo.altform-unplated_targetsize-80.png',
          revision: 'ddce1d6b14f6c2f661774b50eb98c611',
        },
        {
          url: '/icons/windows11/Square44x44Logo.altform-unplated_targetsize-96.png',
          revision: 'a32fa8b78621630dea2c88bbae2911c6',
        },
        {
          url: '/icons/windows11/Square44x44Logo.scale-100.png',
          revision: '099233a068b2a053b23a97bab7ca6e63',
        },
        {
          url: '/icons/windows11/Square44x44Logo.scale-125.png',
          revision: '94331a088281035de0137cf48ffb0031',
        },
        {
          url: '/icons/windows11/Square44x44Logo.scale-150.png',
          revision: '6c169f2620b6e004991e332cf607d4c4',
        },
        {
          url: '/icons/windows11/Square44x44Logo.scale-200.png',
          revision: '9a4c416546dfee52d977564bd5ddd049',
        },
        {
          url: '/icons/windows11/Square44x44Logo.scale-400.png',
          revision: '7a980b73d5b5a19f3d503efe4ef29434',
        },
        {
          url: '/icons/windows11/Square44x44Logo.targetsize-16.png',
          revision: '022bd1befcb2d633f0e7193acf84ab2c',
        },
        {
          url: '/icons/windows11/Square44x44Logo.targetsize-20.png',
          revision: '80b930898a28ee5e980f0e5cb7dc2db3',
        },
        {
          url: '/icons/windows11/Square44x44Logo.targetsize-24.png',
          revision: 'e74ec4fd6e3f4ee71ef5ec2d24a66e5e',
        },
        {
          url: '/icons/windows11/Square44x44Logo.targetsize-256.png',
          revision: '4fcfce15cd29e7be9cbcf96df8b1abb7',
        },
        {
          url: '/icons/windows11/Square44x44Logo.targetsize-30.png',
          revision: '7cd621260d991b63e84592f811acda8b',
        },
        {
          url: '/icons/windows11/Square44x44Logo.targetsize-32.png',
          revision: '377dd3f67fd61f1f0250cfb9d0b57ba7',
        },
        {
          url: '/icons/windows11/Square44x44Logo.targetsize-36.png',
          revision: 'a129be4fe59f36ad180e4379c6e47d5f',
        },
        {
          url: '/icons/windows11/Square44x44Logo.targetsize-40.png',
          revision: '4e22bf687216e1fed27f9bb2b504a515',
        },
        {
          url: '/icons/windows11/Square44x44Logo.targetsize-44.png',
          revision: '099233a068b2a053b23a97bab7ca6e63',
        },
        {
          url: '/icons/windows11/Square44x44Logo.targetsize-48.png',
          revision: '81d46922a00b45053b483fc02396b943',
        },
        {
          url: '/icons/windows11/Square44x44Logo.targetsize-60.png',
          revision: 'a7d78b43f0652e87f6bd08f0b835509f',
        },
        {
          url: '/icons/windows11/Square44x44Logo.targetsize-64.png',
          revision: '04e42560e497ec95c41743c896bb065b',
        },
        {
          url: '/icons/windows11/Square44x44Logo.targetsize-72.png',
          revision: '951f81f186aa1e9e04a6ad6c82599360',
        },
        {
          url: '/icons/windows11/Square44x44Logo.targetsize-80.png',
          revision: 'ddce1d6b14f6c2f661774b50eb98c611',
        },
        {
          url: '/icons/windows11/Square44x44Logo.targetsize-96.png',
          revision: 'a32fa8b78621630dea2c88bbae2911c6',
        },
        {
          url: '/icons/windows11/StoreLogo.scale-100.png',
          revision: 'fd2a1c5eb51e5564e8a9bf8dfd7d2863',
        },
        {
          url: '/icons/windows11/StoreLogo.scale-125.png',
          revision: '3423faadf3298769a550a0e423fea8b6',
        },
        {
          url: '/icons/windows11/StoreLogo.scale-150.png',
          revision: 'a9d1ed2bae3bcd51599201184adf497d',
        },
        {
          url: '/icons/windows11/StoreLogo.scale-200.png',
          revision: '0f666d2162a7b79201eafc531f16f50d',
        },
        {
          url: '/icons/windows11/StoreLogo.scale-400.png',
          revision: '481d2c867d9fe8c545ca625a45e4c0a4',
        },
        {
          url: '/icons/windows11/Wide310x150Logo.scale-100.png',
          revision: 'd4661217119bc06c9b96a8e9361f84d4',
        },
        {
          url: '/icons/windows11/Wide310x150Logo.scale-125.png',
          revision: '16334cb2079c54ea8606e9c7bb1632e3',
        },
        {
          url: '/icons/windows11/Wide310x150Logo.scale-150.png',
          revision: '43e31ab3cf3695e903dc9bc90cb0007f',
        },
        {
          url: '/icons/windows11/Wide310x150Logo.scale-200.png',
          revision: '2df404ffd63bab899fb72a3777fed2a9',
        },
        {
          url: '/icons/windows11/Wide310x150Logo.scale-400.png',
          revision: 'b008f32a9d7362ccfcc34207f82fc7b5',
        },
        { url: '/logo.png', revision: '46bd381aff37fad905c627f4eab1b194' },
        { url: '/logo.svg', revision: '872a2a43a8e35c55e3e0a26785149f4a' },
        { url: '/logo_circle.png', revision: '452982355e022c6d2e9fe9d93057fe1f' },
        { url: '/manifest.json', revision: 'b76fd8703bdf06fde3ff5da0241012bb' },
        { url: '/manifest/icon-192x192.png', revision: '6cc78ccadc0294f06ca360a22ce384a9' },
        { url: '/manifest/icon-256x256.png', revision: 'dfdc33aaece99ee4045b1d8c6f572bb0' },
        { url: '/manifest/icon-384x384.png', revision: 'f3627672e26b5c0cb5b87b73e34f4c1a' },
        { url: '/manifest/icon-512x512.png', revision: '3d68547ed86d64a5bda05c9f8a430711' },
        { url: '/manifest/manifest.webmanifest', revision: '8779685ba13925dd9af2b9ba463509ea' },
        { url: '/og_banner.png', revision: 'eee18f83dd02ac269c318ba7ac3814bf' },
      ],
      { ignoreURLParametersMatching: [] },
    ),
    e.cleanupOutdatedCaches(),
    e.registerRoute(
      '/',
      new e.NetworkFirst({
        cacheName: 'start-url',
        plugins: [
          {
            cacheWillUpdate: async ({ request: e, response: i, event: a, state: s }) =>
              i && 'opaqueredirect' === i.type
                ? new Response(i.body, { status: 200, statusText: 'OK', headers: i.headers })
                : i,
          },
        ],
      }),
      'GET',
    ),
    e.registerRoute(
      /^https:\/\/fonts\.(?:gstatic)\.com\/.*/i,
      new e.CacheFirst({
        cacheName: 'google-fonts-webfonts',
        plugins: [new e.ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 31536e3 })],
      }),
      'GET',
    ),
    e.registerRoute(
      /^https:\/\/fonts\.(?:googleapis)\.com\/.*/i,
      new e.StaleWhileRevalidate({
        cacheName: 'google-fonts-stylesheets',
        plugins: [new e.ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 604800 })],
      }),
      'GET',
    ),
    e.registerRoute(
      /\.(?:eot|otf|ttc|ttf|woff|woff2|font.css)$/i,
      new e.StaleWhileRevalidate({
        cacheName: 'static-font-assets',
        plugins: [new e.ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 604800 })],
      }),
      'GET',
    ),
    e.registerRoute(
      /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
      new e.StaleWhileRevalidate({
        cacheName: 'static-image-assets',
        plugins: [new e.ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 86400 })],
      }),
      'GET',
    ),
    e.registerRoute(
      /\/_next\/image\?url=.+$/i,
      new e.StaleWhileRevalidate({
        cacheName: 'next-image',
        plugins: [new e.ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 86400 })],
      }),
      'GET',
    ),
    e.registerRoute(
      /\.(?:mp3|wav|ogg)$/i,
      new e.CacheFirst({
        cacheName: 'static-audio-assets',
        plugins: [
          new e.RangeRequestsPlugin(),
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      'GET',
    ),
    e.registerRoute(
      /\.(?:mp4)$/i,
      new e.CacheFirst({
        cacheName: 'static-video-assets',
        plugins: [
          new e.RangeRequestsPlugin(),
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      'GET',
    ),
    e.registerRoute(
      /\.(?:js)$/i,
      new e.StaleWhileRevalidate({
        cacheName: 'static-js-assets',
        plugins: [new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 })],
      }),
      'GET',
    ),
    e.registerRoute(
      /\.(?:css|less)$/i,
      new e.StaleWhileRevalidate({
        cacheName: 'static-style-assets',
        plugins: [new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 })],
      }),
      'GET',
    ),
    e.registerRoute(
      /\/_next\/data\/.+\/.+\.json$/i,
      new e.StaleWhileRevalidate({
        cacheName: 'next-data',
        plugins: [new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 })],
      }),
      'GET',
    ),
    e.registerRoute(
      /\.(?:json|xml|csv)$/i,
      new e.NetworkFirst({
        cacheName: 'static-data-assets',
        plugins: [new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 })],
      }),
      'GET',
    ),
    e.registerRoute(
      ({ url: e }) => {
        if (!(self.origin === e.origin)) return !1;
        const i = e.pathname;
        return !i.startsWith('/api/auth/') && !!i.startsWith('/api/');
      },
      new e.NetworkFirst({
        cacheName: 'apis',
        networkTimeoutSeconds: 10,
        plugins: [new e.ExpirationPlugin({ maxEntries: 16, maxAgeSeconds: 86400 })],
      }),
      'GET',
    ),
    e.registerRoute(
      ({ url: e }) => {
        if (!(self.origin === e.origin)) return !1;
        return !e.pathname.startsWith('/api/');
      },
      new e.NetworkFirst({
        cacheName: 'others',
        networkTimeoutSeconds: 10,
        plugins: [new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 })],
      }),
      'GET',
    ),
    e.registerRoute(
      ({ url: e }) => !(self.origin === e.origin),
      new e.NetworkFirst({
        cacheName: 'cross-origin',
        networkTimeoutSeconds: 10,
        plugins: [new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 3600 })],
      }),
      'GET',
    );
});
