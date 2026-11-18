const test = async () => {
  try {
    console.log('--- 1. Testing Register ---');
    const randomSuffix = Math.floor(Math.random() * 10000);
    const regRes = await fetch('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: `hero_${randomSuffix}`,
        email: `hero_${randomSuffix}@example.com`,
        password: 'Password@123'
      })
    });
    const regData = await regRes.json();
    console.log('Register Status:', regRes.status, regData);

    console.log('\n--- 2. Testing Login ---');
    const loginRes = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: `hero_${randomSuffix}`,
        password: 'Password@123'
      })
    });
    const cookie = loginRes.headers.get('set-cookie');
    const loginData = await loginRes.json();
    console.log('Login Status:', loginRes.status, loginData);
    console.log('Set-Cookie received:', !!cookie);

    const token = loginData.data?.accessToken;

    console.log('\n--- 3. Testing Protected /me with Bearer Token ---');
    const meRes = await fetch('http://localhost:3000/api/auth/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const meData = await meRes.json();
    console.log('/me Status:', meRes.status, meData);

    console.log('\n--- 4. Testing Protected /me WITHOUT Token (Expected 401) ---');
    const noTokenRes = await fetch('http://localhost:3000/api/auth/me');
    const noTokenData = await noTokenRes.json();
    console.log('No Token Status:', noTokenRes.status, noTokenData);

    console.log('\n--- 5. Testing Wrong Password (Expected 400) ---');
    const wrongLoginRes = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: `hero_${randomSuffix}`,
        password: 'WrongPassword'
      })
    });
    const wrongLoginData = await wrongLoginRes.json();
    console.log('Wrong Password Status:', wrongLoginRes.status, wrongLoginData);

    console.log('\n--- 6. Testing Refresh Token ---');
    const refreshRes = await fetch('http://localhost:3000/api/auth/refresh', {
      method: 'POST',
      headers: { 'Cookie': cookie }
    });
    const refreshData = await refreshRes.json();
    console.log('Refresh Status:', refreshRes.status, refreshData);

    console.log('\n--- 7. Testing Logout ---');
    const logoutRes = await fetch('http://localhost:3000/api/auth/logout', {
      method: 'POST',
      headers: { 'Cookie': cookie }
    });
    const logoutData = await logoutRes.json();
    console.log('Logout Status:', logoutRes.status, logoutData);

    console.log('\n🎉 ALL TESTS COMPLETED SUCCESSFULLY!');
  } catch (err) {
    console.error('Test Failed:', err);
  }
};

test();
