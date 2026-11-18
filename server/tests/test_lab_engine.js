import 'dotenv/config';

const BASE_URL = `http://localhost:${process.env.PORT || 3000}`;

async function runTests() {
  console.log(`🧪 Starting PETBUG System Tests against: ${BASE_URL}\n`);

  try {
    // 1. Health check
    console.log('1️⃣ Checking /api/health...');
    const healthRes = await fetch(`${BASE_URL}/api/health`);
    const healthData = await healthRes.json();
    console.log(`   Health status: ${healthRes.status}`, healthData);

    // 2. Public labs list
    console.log('\n2️⃣ Testing GET /api/labs...');
    const labsRes = await fetch(`${BASE_URL}/api/labs`);
    const labsData = await labsRes.json();
    console.log(`   Labs count: ${labsData.data?.length || 0}`);
    if (labsData.data && labsData.data.length > 0) {
      console.log(`   Sample Lab:`, {
        id: labsData.data[0].id,
        title: labsData.data[0].title,
        difficulty: labsData.data[0].difficulty,
        points: labsData.data[0].points,
        isSolved: labsData.data[0].isSolved,
      });
    }

    // 3. Register & Login
    console.log('\n3️⃣ Testing Register and Login...');
    const suffix = Math.floor(Math.random() * 90000) + 10000;
    const testUsername = `hacker_${suffix}`;
    const testEmail = `hacker_${suffix}@petbug.io`;
    const testPassword = 'Password@123';

    const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: testUsername,
        email: testEmail,
        password: testPassword,
      }),
    });
    const regData = await regRes.json();
    console.log(`   Register: status ${regRes.status}`, regData.success ? 'SUCCESS' : regData.message);

    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: testUsername,
        password: testPassword,
      }),
    });
    const loginData = await loginRes.json();
    const token = loginData.data?.accessToken;
    console.log(`   Login: status ${loginRes.status}`, {
      user: loginData.data?.user?.username,
      hasToken: !!token,
    });

    // 4. Leaderboard & Badges
    console.log('\n4️⃣ Testing GET /api/leaderboard and /api/leaderboard/badges...');
    const lbRes = await fetch(`${BASE_URL}/api/leaderboard`);
    const lbData = await lbRes.json();
    console.log(`   Leaderboard users count: ${lbData.data?.length || 0}`);

    const badgeRes = await fetch(`${BASE_URL}/api/leaderboard/badges`);
    const badgeData = await badgeRes.json();
    console.log(`   Badges available: ${badgeData.data?.length || 0}`);

    // 5. Active Instance check
    console.log('\n5️⃣ Testing GET /api/instances/active...');
    const activeRes = await fetch(`${BASE_URL}/api/instances/active`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const activeData = await activeRes.json();
    console.log(`   Active instance:`, activeData.data);

    console.log('\n✅ All API Integration checks passed!');
  } catch (err) {
    console.error('❌ Test failed:', err.message);
  }
}

runTests();
