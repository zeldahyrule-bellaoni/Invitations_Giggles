// recruit-ladies-full.js
module.exports = async function runStatsExtractor(page) {
  // -------------------------------
  // Phase 1: Profile ID Extraction (No Club)
  // -------------------------------
  console.log("🚀 Starting Phase 1: Profile ID Extraction (No Club)");

  const startPage = 1;
  const endPage = 1;
  const tierId = 1;
  let allProfiles = [];

  await page.goto('https://v3.g.ladypopular.com', {
    waitUntil: 'domcontentloaded',
    timeout: 60000
  });
  await page.waitForTimeout(4000);

  console.log(`🔍 Scanning pages ${startPage} → ${endPage}`);

  for (let currentPage = startPage; currentPage <= endPage; currentPage++) {
    console.log(`📄 Processing page ${currentPage}...`);

    try {
      const profilesOnPage = await page.evaluate(async ({ currentPage, tierId }) => {
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
          if (guildCell.querySelector('a')) return; // Already in a club

          const idMatch = profileLink.getAttribute('href').match(/id=(\d+)/);
          if (!idMatch) return;

          const nameEl = row.querySelector('.player-avatar-name');
          const name = nameEl ? nameEl.textContent.trim() : 'Unknown';

          results.push({
            profileId: idMatch[1],
            name
          });
        });

        return results;
      }, { currentPage, tierId });

      console.log(`   🎯 Found ${profilesOnPage.length} profiles without club`);
      allProfiles.push(...profilesOnPage);

    } catch (err) {
      console.log(`❌ Error on page ${currentPage}: ${err.message}`);
    }

    await page.waitForTimeout(2000);
  }

  console.log("✅ Phase 1 Complete");
  console.log(`👭 Total profiles without club: ${allProfiles.length}`);
  console.log("📋 Sample output:");
  console.log(allProfiles.slice(0, 5));

  // -------------------------------
  // Phase 2: Extract Lady IDs from Profile Pages
  // -------------------------------
  console.log(`🚀 Starting Phase 2: Extract Lady IDs`);

  let allLadies = [];

  for (let i = 0; i < allProfiles.length; i++) {
    const profile = allProfiles[i];
    console.log(`📄 Visiting profile ${i + 1}/${allProfiles.length}: ${profile.name} (${profile.profileId})`);

    try {
      const ladyId = await page.evaluate(async (profileId) => {
        const profileUrl = `/profile.php?id=${profileId}`;
        const res = await fetch(profileUrl, { credentials: 'same-origin' });
        const html = await res.text();

        const container = document.createElement('div');
        container.innerHTML = html;

        const img = container.querySelector('img[name="0"]');
        if (!img) return null;

        const imgSrc = img.getAttribute('src');

        // Extract all numbers
        const numbers = imgSrc.match(/\d+/g) || [];

        // Pick first number >=5 digits and different from profileId
        const ladyIdCandidate = numbers.find(num => num.length >= 5 && num !== profileId);

        return ladyIdCandidate || null;
      }, profile.profileId);

      if (ladyId) {
        console.log(`   🆔 Found Lady ID: ${ladyId}`);
        allLadies.push({ name: profile.name, ladyId });
      } else {
        console.log(`⚠️ Could not find Lady ID for ${profile.name} (${profile.profileId})`);
      }

    } catch (err) {
      console.log(`❌ Error extracting Lady ID for ${profile.name} (${profile.profileId}): ${err.message}`);
    }

    await page.waitForTimeout(1500);
  }

  console.log(`✅ Phase 2 Complete. Total Lady IDs found: ${allLadies.length}`);
  console.log("📋 Sample output:");
  console.log(allLadies.slice(0, 5));

  // -------------------------------
  // Phase 3: Sending Invites
  // -------------------------------
  if (allLadies.length === 0) {
    console.log("❌ No ladies to invite. Phase 3 skipped.");
    return;
  }

  console.log(`🚀 Starting Phase 3: Sending invites to ${allLadies.length} ladies`);

  const inviteMessage = `Hello dear! 🌸 We’d be happy to welcome you to our club. You are active, strong, and would be a wonderful addition to our team. ➊ 💖 Donations are completely voluntary, and we are very flexible about them. ➋ ⚔️ We encourage members to improve their skills at their own pace and to participate in club battles, which we plan to hold on a fixed day every week. ➌ 👑 We currently have a Vice President position open and are looking to recruit committed members (including you, if you’re interested) who are willing to share responsibility in decision-making for club policies and implementation. ➍ 🤝 We truly value every member’s opinion. All members have an equal say in how the club operates, and decisions are made with collective consent, regardless of level or skill. ➎ 👭 Our current goal is to build a strong club made up of strong ladies with a true sense of loyalty and belonging. We would be delighted to have you join us. Happy gaming! 🌟`;

  for (let i = 0; i < allLadies.length; i++) {
    const lady = allLadies[i];
    console.log(`📤 Sending invite ${i + 1}/${allLadies.length}`);
    console.log(`   👩 Name: ${lady.name}`);
    console.log(`   🆔 Lady ID: ${lady.ladyId}`);
    console.log(`   🌐 Current page: ${page.url()}`);

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

      console.log(`   📝 Response: ${JSON.stringify(res)}`);

      if (res.status === 1) {
        console.log(`✅ Invite sent to ${lady.name} (${lady.ladyId})`);
      } else {
        console.log(`⚠️ Failed to send invite to ${lady.name} (${lady.ladyId}): ${res.message || 'Unknown error'}`);
      }

    } catch (err) {
      console.log(`❌ Error sending invite to ${lady.name} (${lady.ladyId}): ${err.message}`);
    }

    await page.waitForTimeout(2000);
  }

  console.log("✅ Phase 3 Complete. All invites processed.");
};
