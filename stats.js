// recruit-ladies.js
module.exports = async function runStatsExtractor(page) {
  console.log("🏠 Starting Club Recruitment Script (Manual Page Range)...");

  // ⚙️ MANUAL CONFIGURATION - Change these values before each run
  const startPage = 1;    // ← Change this to your desired starting page
  const endPage = 2;     // ← Change this to your desired ending page (inclusive)

  // Example:
  // First run:  startPage = 1;   endPage = 50;
  // Second run: startPage = 51;  endPage = 100;
  // And so on...

  if (startPage < 1 || endPage < startPage) {
    console.log("❌ Invalid page range. startPage must be >= 1 and endPage >= startPage.");
    return;
  }

  const tierId = 1;
  const rankingAjaxUrl = 'https://ladypopular.com/ajax/ranking/players.php';
  const inviteAjaxUrl = 'https://ladypopular.com/ajax/guild.php';
  
  // ⚙️ MANUAL INVITE MESSAGE - Change this text before each run if you want a different message
  const inviteMessage = 'Hello dear! 🌸 We’d be happy to welcome you to our club. You are active, strong, and would be a wonderful addition to our team. ➊ 💖 Donations are completely voluntary, and we are very flexible about them. ➋ ⚔️ We encourage members to improve their skills at their own pace and to participate in club battles, which we plan to hold on a fixed day every week. ➌ 👑 We currently have a Vice President position open and are looking to recruit committed members (including you, if you’re interested) who are willing to share responsibility in decision-making for club policies and implementation. ➍ 🤝 We truly value every member’s opinion. All members have an equal say in how the club operates, and decisions are made with collective consent, regardless of level or skill. We believe in the principle of one person, one value. ➎ 👭 Our current goal is to build a strong club made up of strong ladies with a true sense of loyalty and belonging. We would be delighted to have you join us. Happy gaming! 🌟😉';

  let totalInvitesSent = 0;
  let totalLadiesFound = 0;

  // Ensure session is active
  await page.goto('https://ladypopular.com', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(5000);

  console.log(`\n🔍 Scanning ranking pages ${startPage} to ${endPage}...`);

  for (let currentPage = startPage; currentPage <= endPage; currentPage++) {
    console.log(`\n📄 Processing page ${currentPage}...`);

    let ladyIdsWithoutGuild = [];

    try {
      const response = await page.request.post(rankingAjaxUrl, {
        form: {
          action: 'getRanking',
          page: currentPage.toString(),
          tierId: tierId.toString(),
        },
        timeout: 60000,
      });

      if (!response.ok()) {
        console.log(`❌ HTTP error on page ${currentPage} (status: ${response.status()})`);
        continue;
      }

      const data = await response.json();

      if (data.status !== 1 || !data.html) {
        console.log(`❌ Invalid response on page ${currentPage}`);
        continue;
      }

      ladyIdsWithoutGuild = await page.evaluate(html => {
        const div = document.createElement('div');
        div.innerHTML = html;
        const rows = div.querySelectorAll('tbody tr');
        const results = [];

        rows.forEach(row => {
          const guildCell = row.querySelector('td.ranking-player-guild');
          if (guildCell && guildCell.children.length === 0) { // Empty = no club
            const profileLink = row.querySelector('a[href^="/profile.php?id="]');
            if (profileLink) {
              const href = profileLink.getAttribute('href');
              const ladyId = href.match(/id=(\d+)/)?.[1];
              if (ladyId) {
                const nameElement = row.querySelector('.player-avatar-name');
                const name = nameElement ? nameElement.textContent.trim() : 'Unknown';
                results.push({ ladyId, name });
              }
            }
          }
        });

        return results;
      }, data.html);

      totalLadiesFound += ladyIdsWithoutGuild.length;
      console.log(`   🎯 Found ${ladyIdsWithoutGuild.length} ladies without a club.`);

    } catch (err) {
      console.log(`❌ Error fetching page ${currentPage}: ${err.message}`);
      continue;
    }

    // Phase 2: Send invites
    if (ladyIdsWithoutGuild.length > 0) {
      console.log(`   📩 Sending ${ladyIdsWithoutGuild.length} invites...`);

      for (const { ladyId, name } of ladyIdsWithoutGuild) {
        try {
          const inviteResponse = await page.request.post(inviteAjaxUrl, {
            form: {
              type: 'invite',
              lady: ladyId,
              message: inviteMessage,
            },
            timeout: 30000,
          });

          const result = await inviteResponse.json();

          if (result.status === 1) {
            console.log(`✅ Invite sent to ${name} (ID: ${ladyId})`);
            totalInvitesSent++;
          } else {
            console.log(`❌ Failed: ${name} (ID: ${ladyId}) - ${result.message || 'Unknown error'}`);
          }

          await page.waitForTimeout(2000); // 2-second delay between invites

        } catch (err) {
          console.log(`❌ Network error inviting ${name} (ID: ${ladyId}): ${err.message}`);
        }
      }
    }

    // Delay between pages
    await page.waitForTimeout(3000);
  }

  console.log(`\n🏁 Recruitment complete!`);
  console.log(`   Pages processed: ${startPage} → ${endPage}`);
  console.log(`   Ladies without club found: ${totalLadiesFound}`);
  console.log(`   Invites successfully sent: ${totalInvitesSent}`);
};
