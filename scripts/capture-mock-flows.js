const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const rootDir = path.resolve(__dirname, '..');
const outputDir = path.join(rootDir, 'docs', 'screenshots');
const pageUrl = process.env.MOCK_CAPTURE_URL || 'http://127.0.0.1:8123/src/mock.html';

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

async function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getTimelineFrame(page) {
  await page.waitForSelector('#mock-content-frame');
  for (let i = 0; i < 50; i += 1) {
    const frame = page.frames().find((item) => /moock-timeline\.html/.test(item.url()));
    if (frame) {
      await frame.waitForSelector('body');
      return frame;
    }
    await wait(100);
  }
  throw new Error('Timeline frame was not found.');
}

async function captureDevice(page, filename) {
  const device = page.locator('.device');
  await device.screenshot({ path: path.join(outputDir, filename) });
}

async function setupBaseState(frame) {
  await frame.evaluate(() => {
    if (typeof closeCommentView === 'function' && document.getElementById('comment-view')?.classList.contains('open')) {
      closeCommentView();
    }
    if (typeof closeCommentActionMenu === 'function') closeCommentActionMenu();
    if (typeof closeReadersModal === 'function') closeReadersModal();
    if (typeof closeInviteUsersModal === 'function') closeInviteUsersModal(null);
    if (typeof closeManageUsersModal === 'function') closeManageUsersModal();
    if (typeof closeAdminReportsModal === 'function') closeAdminReportsModal();
    if (typeof closeGroupRequestModal === 'function') closeGroupRequestModal();
    if (typeof closeGroupDetailModal === 'function') closeGroupDetailModal();
    if (typeof closeReportReasonModal === 'function') closeReportReasonModal(null);
    if (typeof closeMediaPreview === 'function') closeMediaPreview();
    if (typeof closeAppDialog === 'function') closeAppDialog(undefined);
    if (typeof activateTopMenu === 'function') activateTopMenu(0);
    if (typeof rerenderTimeline === 'function') rerenderTimeline();
    if (typeof scrollTo === 'function') scrollTo({ top: 0, behavior: 'instant' });
  });
  await wait(200);
}

async function findFirstPostWith(frame, predicateSource) {
  return frame.evaluate((source) => {
    const predicate = new Function('post', `return (${source})(post);`);
    const post = Array.isArray(posts) ? posts.find((item) => predicate(item)) : null;
    return post ? Number(post.id || 0) : 0;
  }, predicateSource);
}

async function main() {
  ensureDir(outputDir);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 430, height: 932 },
    deviceScaleFactor: 1,
  });

  await page.goto(pageUrl, { waitUntil: 'networkidle' });
  const frame = await getTimelineFrame(page);
  await wait(300);

  const captures = [
    {
      filename: '01-timeline.png',
      label: 'タイムライン',
      pathLabel: 'タイムライン初期表示',
      action: async () => {
        await setupBaseState(frame);
      },
    },
    {
      filename: '02-post-menu.png',
      label: '投稿メニュー',
      pathLabel: '投稿カード -> メニュー',
      action: async () => {
        await setupBaseState(frame);
        const button = frame.locator('.menu-btn').first();
        await button.click();
      },
    },
    {
      filename: '03-media-preview.png',
      label: 'メディアプレビュー',
      pathLabel: '投稿カード -> 画像/動画',
      action: async () => {
        await setupBaseState(frame);
        await frame.evaluate(() => {
          const post = Array.isArray(posts)
            ? posts.find((item) => Array.isArray(item.attachments) && item.attachments.some((a) => String(a.type || '').startsWith('image/') || String(a.type || '').startsWith('video/')))
            : null;
          if (!post) return;
          const visualItems = post.attachments.filter((a) => String(a.type || '').startsWith('image/') || String(a.type || '').startsWith('video/'));
          if (visualItems.length > 0) openMediaPreview(visualItems, 0);
        });
      },
    },
    {
      filename: '04-readers-modal.png',
      label: '既読者モーダル',
      pathLabel: '投稿カード -> 既読人数',
      action: async () => {
        await setupBaseState(frame);
        await frame.evaluate(() => {
          const post = Array.isArray(posts)
            ? posts.find((item) => Array.isArray(item.readers) && item.readers.length > 0)
            : null;
          if (post) openReadersModal(post.readers);
        });
      },
    },
    {
      filename: '05-comment-view.png',
      label: 'コメントビュー',
      pathLabel: '投稿カード -> コメント',
      action: async () => {
        await setupBaseState(frame);
        await frame.evaluate(() => {
          const post = Array.isArray(posts) && posts.length > 0 ? posts[0] : null;
          if (post) renderCommentView(post);
        });
      },
    },
    {
      filename: '06-comment-header-menu.png',
      label: 'コメントヘッダーメニュー',
      pathLabel: 'コメントビュー -> ヘッダーメニュー',
      action: async () => {
        await setupBaseState(frame);
        await frame.evaluate(() => {
          const post = Array.isArray(posts) && posts.length > 0 ? posts[0] : null;
          if (post) renderCommentView(post);
        });
        await frame.locator('#comment-header-menu').click();
      },
    },
    {
      filename: '07-comment-action-sheet.png',
      label: 'コメントアクションシート',
      pathLabel: 'コメント長押し',
      action: async () => {
        await setupBaseState(frame);
        await frame.evaluate(() => {
          const post = Array.isArray(posts)
            ? posts.find((item) => Array.isArray(item.comments) && item.comments.length > 0)
            : null;
          if (!post) return;
          renderCommentView(post);
          const ownIndex = post.comments.findIndex((comment) => String(comment.user || '') === String(CURRENT_USER || ''));
          const idx = ownIndex >= 0 ? ownIndex : 0;
          const target = post.comments[idx];
          openCommentActionMenu(idx, idx === ownIndex, Number.isFinite(target.commentId) ? target.commentId : null);
        });
      },
    },
    {
      filename: '08-comment-editing.png',
      label: 'コメント編集中',
      pathLabel: 'コメントアクションシート -> 編集',
      action: async () => {
        await setupBaseState(frame);
        await frame.evaluate(() => {
          const post = Array.isArray(posts)
            ? posts.find((item) => Array.isArray(item.comments) && item.comments.some((comment) => String(comment.user || '') === String(CURRENT_USER || '')))
            : null;
          if (!post) return;
          renderCommentView(post);
          const idx = post.comments.findIndex((comment) => String(comment.user || '') === String(CURRENT_USER || ''));
          editingCommentIndex = idx >= 0 ? idx : null;
          renderCommentView(post);
        });
      },
    },
    {
      filename: '09-groups-view.png',
      label: 'グループ一覧',
      pathLabel: '上部タブ -> グループ',
      action: async () => {
        await setupBaseState(frame);
        await frame.evaluate(() => {
          activateTopMenu(1);
        });
      },
    },
    {
      filename: '10-group-detail.png',
      label: 'グループ詳細モーダル',
      pathLabel: 'グループ一覧 -> グループ行',
      action: async () => {
        await setupBaseState(frame);
        await frame.evaluate(() => {
          activateTopMenu(1);
          const group = GROUP_DIRECTORY.find((item) => item.joined) || GROUP_DIRECTORY[0];
          if (group) openGroupDetailModal(group);
        });
      },
    },
    {
      filename: '11-group-menu.png',
      label: 'グループ行メニュー',
      pathLabel: 'グループ一覧 -> ･･･',
      action: async () => {
        await setupBaseState(frame);
        await frame.evaluate(() => {
          activateTopMenu(1);
        });
        await frame.locator('.group-action-btn.more').first().click();
      },
    },
    {
      filename: '12-manage-users.png',
      label: 'メンバー管理モーダル',
      pathLabel: 'グループ一覧 -> メンバー管理',
      action: async () => {
        await setupBaseState(frame);
        await frame.evaluate(() => {
          activateTopMenu(1);
          const group = GROUP_DIRECTORY.find((item) => item.joined && item.admin) || GROUP_DIRECTORY.find((item) => item.joined) || GROUP_DIRECTORY[0];
          if (group) openManageUsersModal(group);
        });
      },
    },
    {
      filename: '13-invite-users.png',
      label: '招待申請モーダル',
      pathLabel: 'グループ一覧 -> 招待',
      action: async () => {
        await setupBaseState(frame);
        await frame.evaluate(() => {
          activateTopMenu(1);
          const group = GROUP_DIRECTORY.find((item) => item.joined) || GROUP_DIRECTORY[0];
          const users = Array.isArray(people) ? people.filter((name) => name !== CURRENT_USER) : [];
          if (group) openInviteUsersModal(group, users);
        });
      },
    },
    {
      filename: '14-group-request.png',
      label: 'グループ作成申請モーダル',
      pathLabel: 'グループ一覧 -> グループ作成',
      action: async () => {
        await setupBaseState(frame);
        await frame.evaluate(() => {
          activateTopMenu(1);
          openGroupRequestModal();
        });
      },
    },
    {
      filename: '15-notifications-general.png',
      label: '通知ビュー',
      pathLabel: '上部タブ -> 通知',
      action: async () => {
        await setupBaseState(frame);
        await frame.evaluate(() => {
          activateTopMenu(2);
          currentNotificationsTab = 'general';
          renderNotificationsPanel();
        });
      },
    },
    {
      filename: '16-notifications-admin.png',
      label: '管理者向け通知ビュー',
      pathLabel: '通知 -> 管理者向け通知タブ',
      action: async () => {
        await setupBaseState(frame);
        await frame.evaluate(() => {
          activateTopMenu(2);
          currentNotificationsTab = 'admin';
          renderNotificationsPanel();
        });
      },
    },
    {
      filename: '17-settings-view.png',
      label: '設定ビュー',
      pathLabel: '上部タブ -> 設定',
      action: async () => {
        await setupBaseState(frame);
        await frame.evaluate(() => {
          activateTopMenu(3);
          renderSettingsPanel();
        });
      },
    },
    {
      filename: '18-report-reason.png',
      label: '報告理由モーダル',
      pathLabel: '投稿/コメント -> 通報',
      action: async () => {
        await setupBaseState(frame);
        await frame.evaluate(() => {
          openReportReasonModal();
        });
      },
    },
    {
      filename: '19-app-dialog-alert.png',
      label: 'お知らせダイアログ',
      pathLabel: 'showAlert 系',
      action: async () => {
        await setupBaseState(frame);
        await frame.evaluate(() => {
          openAppDialog({ type: 'alert', title: 'お知らせ', message: 'この画面は確認用のダイアログです', okText: '閉じる', okClass: 'cancel' });
        });
      },
    },
    {
      filename: '20-app-dialog-confirm.png',
      label: '確認ダイアログ',
      pathLabel: 'showConfirm 系',
      action: async () => {
        await setupBaseState(frame);
        await frame.evaluate(() => {
          openAppDialog({ type: 'confirm', title: '確認', message: 'この操作を実行しますか？', okText: '実行', cancelText: 'キャンセル', okClass: 'danger' });
        });
      },
    },
    {
      filename: '21-edit-post-dialog.png',
      label: '投稿編集ダイアログ',
      pathLabel: '投稿メニュー -> 編集',
      action: async () => {
        await setupBaseState(frame);
        await frame.evaluate(() => {
          const post = Array.isArray(posts) ? posts.find((item) => item.author && item.author.user === CURRENT_USER) : null;
          if (!post) return;
          openAppDialog({
            type: 'prompt',
            title: '投稿を編集',
            message: '',
            defaultValue: post.content || '',
            okText: '保存',
            cancelText: 'キャンセル',
            showMediaTools: true,
            initialAttachments: post.attachments || []
          });
        });
      },
    },
    {
      filename: '22-share-dialog.png',
      label: 'シェア投稿ダイアログ',
      pathLabel: '投稿カード -> シェア',
      action: async () => {
        await setupBaseState(frame);
        await frame.evaluate(() => {
          const sourcePost = Array.isArray(posts) && posts.length > 0 ? posts[0] : null;
          if (!sourcePost) return;
          const shareOptions = shareableFeeds().map((feed) => ({ label: feed.name, id: feed.id }));
          openAppDialog({
            type: 'prompt',
            title: 'シェアして投稿',
            message: '',
            defaultValue: '',
            okText: '投稿する',
            cancelText: 'キャンセル',
            showMediaTools: true,
            showTargetSelect: true,
            targetLabel: '投稿先',
            targetOptions: shareOptions,
            targetValue: shareOptions[0] ? shareOptions[0].value : '',
            sharePreviewHtml: '<div style="padding:8px;border:1px solid #e4e6eb;border-radius:10px;background:#fff;">シェア元投稿プレビュー</div>'
          });
        });
      },
    },
    {
      filename: '23-admin-reports.png',
      label: '管理者向け報告一覧モーダル',
      pathLabel: '通知 or 管理導線 -> 報告一覧',
      action: async () => {
        await setupBaseState(frame);
        await frame.evaluate(() => {
          activateTopMenu(2);
          const adminGroup = GROUP_DIRECTORY.find((item) => item.joined && item.admin) || GROUP_DIRECTORY.find((item) => item.joined) || GROUP_DIRECTORY[0];
          const feedId = adminGroup ? feedIdByGroup(adminGroup) : '';
          openAdminReportsModal(feedId);
        });
      },
    },
    {
      filename: '24-header-version-popup.png',
      label: 'ヘッダーバージョンポップアップ',
      pathLabel: 'ヘッダー -> ロゴ長押し',
      action: async () => {
        await setupBaseState(frame);
        const headerFrame = page.frames().find((item) => /mock-header\.html/.test(item.url()));
        if (!headerFrame) return;
        await headerFrame.evaluate(() => {
          const popup = document.getElementById('version-popup');
          if (!popup) return;
          popup.textContent = 'v2026.03.12-204500';
          popup.classList.add('show');
          popup.setAttribute('aria-hidden', 'false');
        });
      },
    },
  ];

  for (const item of captures) {
    process.stdout.write(`starting ${item.filename}\n`);
    await item.action();
    await wait(350);
    await captureDevice(page, item.filename);
    process.stdout.write(`captured ${item.filename}\n`);
  }

  const metadata = captures.map((item) => ({
    file: item.filename,
    label: item.label,
    pathLabel: item.pathLabel,
  }));
  fs.writeFileSync(path.join(outputDir, 'index.json'), JSON.stringify(metadata, null, 2));

  await browser.close();
  process.stdout.write('done\n');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
