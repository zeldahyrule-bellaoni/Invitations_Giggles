// recruit-ladies-full.js
module.exports = async function runStatsExtractor(page) {
  // -------------------------------
  // Phase 1: Lady ID Extraction
  // -------------------------------
  console.log("🚀 Starting Phase 1: Lady ID Extraction (No Club)");

  const startPage = 1;
  const endPage = 1;
  const tierId = 1;
  let allLadies = [];

  // Ensure logged-in session
  await page.goto('https://v3.g.ladypopular.com', {
    waitUntil: 'domcontentloaded',
    timeout: 60000
  });
  await page.waitForTimeout(4000);

  console.log(`🔍 Scanning pages ${startPage} → ${endPage}`);

  for (let currentPage = startPage; currentPage <= endPage; currentPage++) {
    console.log(`📄 Processing page ${currentPage}...`);

    try {
      const ladiesOnPage = await page.evaluate(async ({ currentPage, tierId }) => {
        const res = await fetch('/ajax/ranking/players.php', {
          method: 'POST',
          body: new URLSearchParams({
            action: 'getRanking',
            page: currentPage.toString(),
            tierId: tierId.toString()
          }),
          credentials: 'same-origin'
        });

        const data = await res.json();
        if (!data.html) return [];

        const container = document.createElement('div');
        container.innerHTML = data.html;

        const rows = container.querySelectorAll('tr');
        const results = [];

        rows.forEach(row => {
          const profileLink = row.querySelector('a[href*="profile.php?id="]');
          const guildCell = row.querySelector('.ranking-player-guild');

          if (!profileLink || !guildCell) return;

          // Skip if already in a club
          if (guildCell.querySelector('a')) return;

          const idMatch = profileLink.getAttribute('href').match(/id=(\d+)/);
          if (!idMatch) return;

          const nameEl = row.querySelector('.player-avatar-name');
          const name = nameEl ? nameEl.textContent.trim() : 'Unknown';

          results.push({
            ladyId: idMatch[1],
            name
          });
        });

        return results;
      }, { currentPage, tierId });

      console.log(`   🎯 Found ${ladiesOnPage.length} ladies without club`);
      allLadies.push(...ladiesOnPage);

    } catch (err) {
      console.log(`❌ Error on page ${currentPage}: ${err.message}`);
    }

    await page.waitForTimeout(2000);
  }

  console.log("✅ Phase 1 Complete");
  console.log(`👭 Total ladies without club: ${allLadies.length}`);
  console.log("📋 Sample output:");
  console.log(allLadies.slice(0, 5));

  // -------------------------------
  // Phase 2: Sending Invites
  // -------------------------------
  if (allLadies.length === 0) {
    console.log("❌ No ladies to invite. Phase 2 skipped.");
    return;
  }

  console.log(`🚀 Starting Phase 2: Sending invites to ${allLadies.length} ladies`);

  const inviteMessage = `Hello dear! 🌸 We’d be happy to welcome you to our club. You are active, strong, and would be a wonderful addition to our team. ➊ 💖 Donations are completely voluntary, and we are very flexible about them. ➋ ⚔️ We encourage members to improve their skills at their own pace and to participate in club battles, which we plan to hold on a fixed day every week. ➌ 👑 We currently have a Vice President position open and are looking to recruit committed members (including you, if you’re interested) who are willing to share responsibility in decision-making for club policies and implementation. ➍ 🤝 We truly value every member’s opinion. All members have an equal say in how the club operates, and decisions are made with collective consent, regardless of level or skill. ➎ 👭 Our current goal is to build a strong club made up of strong ladies with a true sense of loyalty and belonging. We would be delighted to have you join us. Happy gaming! 🌟`;

  for (let i = 0; i < allLadies.length; i++) {
    const lady = allLadies[i];

    try {
      const res = await page.evaluate(async ({ ladyId, message }) => {
        const response = await fetch('/ajax/guilds.php', {
          method: 'POST',
          body: new URLSearchParams({
            type: 'invite',
            lady: ladyId,
            message
          }),
          credentials: 'same-origin'
        });
        return await response.json();
      }, { ladyId: lady.ladyId, message: inviteMessage });

      if (res.status === 1) {
        console.log(`✅ Invite sent to ${lady.name} (${lady.ladyId})`);
      } else {
        console.log(`⚠️ Failed to send invite to ${lady.name} (${lady.ladyId}): ${res.message || 'Unknown error'}`);
      }

    } catch (err) {
      console.log(`❌ Error sending invite to ${lady.name} (${lady.ladyId}): ${err.message}`);
    }

    // Small delay to avoid spam detection
    await page.waitForTimeout(2000);
  }

  console.log("✅ Phase 2 Complete. All invites processed.");
};
