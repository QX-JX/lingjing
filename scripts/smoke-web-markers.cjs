const assert = require('node:assert/strict');

function unwrapOuterTag(raw, tagName) {
  const pattern = new RegExp(`^<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>$`);
  return raw.match(pattern)?.[1] ?? raw;
}

function wrapVoice(text, voiceId, voiceName, voiceAvatar = '') {
  return `<voice voice_id="${voiceId}" voice_name="${voiceName}" voice_avatar="${voiceAvatar}">${text}</voice>`;
}

function updateVoiceMarker(raw, voiceId, voiceName, voiceAvatar = '') {
  const content = unwrapOuterTag(raw, 'voice');
  return wrapVoice(content, voiceId, voiceName, voiceAvatar);
}

function wrapPolyphone(char, pronunciation) {
  return `<polyphone pronunciation="${pronunciation}">${char}</polyphone>`;
}

function removeOuterMarker(raw, tagName) {
  return unwrapOuterTag(raw, tagName);
}

function run() {
  const wrappedVoice = wrapVoice('你好', 'xiaoyu', '晓晓', '/avatar-a.png');
  assert.equal(
    wrappedVoice,
    '<voice voice_id="xiaoyu" voice_name="晓晓" voice_avatar="/avatar-a.png">你好</voice>'
  );

  const updatedVoice = updateVoiceMarker(
    '<voice voice_id="zhiwei" voice_name="云希" voice_avatar="/avatar-z.png">你好<polyphone pronunciation="zhong4">重</polyphone></voice>',
    'xiaofeng',
    '云野',
    '/avatar-b.png'
  );
  assert.equal(
    updatedVoice,
    '<voice voice_id="xiaofeng" voice_name="云野" voice_avatar="/avatar-b.png">你好<polyphone pronunciation="zhong4">重</polyphone></voice>'
  );

  const removedVoice = removeOuterMarker(
    '<voice voice_id="xiaoyu" voice_name="晓晓" voice_avatar="/avatar-a.png"><speed rate="1.3">你好</speed><polyphone pronunciation="zhong4">重</polyphone></voice>',
    'voice'
  );
  assert.equal(removedVoice, '<speed rate="1.3">你好</speed><polyphone pronunciation="zhong4">重</polyphone>');

  const polyphone = wrapPolyphone('重', 'zhong4');
  assert.equal(polyphone, '<polyphone pronunciation="zhong4">重</polyphone>');

  const removedPolyphone = removeOuterMarker(polyphone, 'polyphone');
  assert.equal(removedPolyphone, '重');

  const combined = wrapVoice(`<number mode="spell">2025</number>${wrapPolyphone('重', 'chong2')}`, 'xiaoni', '晓妮', '/avatar-c.png');
  assert.equal(
    combined,
    '<voice voice_id="xiaoni" voice_name="晓妮" voice_avatar="/avatar-c.png"><number mode="spell">2025</number><polyphone pronunciation="chong2">重</polyphone></voice>'
  );

  console.log('web marker smoke passed');
}

run();
