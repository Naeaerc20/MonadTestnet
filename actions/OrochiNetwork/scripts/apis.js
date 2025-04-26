// actions/OrochiNetwork/scripts/apis.js
const axios              = require('axios');
const { SocksProxyAgent} = require('socks-proxy-agent');

const ENDPOINT = 'https://onprover-api.orochi.network/graphql';
const UA       = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)';

function buildConfig(bearer, proxy) {
  const agent = proxy ? new SocksProxyAgent(proxy) : undefined;
  return {
    headers: {
      Authorization: `Bearer ${bearer}`,
      'User-Agent': UA,
    },
    httpsAgent: agent,
    httpAgent: agent,
    timeout: 15_000,
  };
}

async function getUserInfo(bearer, proxy) {
  const { data } = await axios.post(
    ENDPOINT,
    {
      operationName: 'UserInfo',
      query: 'query UserInfo { userInfo { totalReward } }',
      variables: {},
    },
    buildConfig(bearer, proxy),
  );
  return data?.data?.userInfo?.totalReward ?? '0';
}

async function enableNode(bearer, proxy) {
  const { data } = await axios.post(
    ENDPOINT,
    {
      operationName: 'GenerateChallenge',
      query: 'mutation GenerateChallenge { generateChallenge { challenge } }',
      variables: {},
    },
    buildConfig(bearer, proxy),
  );
  return data?.data?.generateChallenge?.challenge ?? null;
}

module.exports = { getUserInfo, enableNode };
