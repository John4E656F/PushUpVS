// Shared rep-synced video player: a workout video with one tappable chip
// per rep that seeks playback to that rep (with a short lead-in).

import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';

import { T, wfont } from '@/lib/theme';

export function RepReplay({
  source,
  repTimesMs,
  videoStartMs = 0,
  height = 240,
}: {
  source: string;
  repTimesMs: number[];
  videoStartMs?: number;
  height?: number;
}) {
  const player = useVideoPlayer(source, (p) => {
    p.loop = false;
  });
  const [activeRep, setActiveRep] = useState<number | null>(null);

  const seekToRep = (i: number) => {
    const t = Math.max(0, (repTimesMs[i] - videoStartMs) / 1000 - 1.2);
    player.currentTime = t;
    player.play();
    setActiveRep(i);
  };

  return (
    <View>
      <VideoView player={player} style={{ width: '100%', height }} contentFit="cover" nativeControls />
      <View style={{ padding: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ fontFamily: wfont(700), fontSize: 14.5, color: T.text }}>Rep replay</Text>
          <Text style={{ fontSize: 12.5, color: T.text3 }}>tap a rep to jump to it</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 7, paddingTop: 10 }}
        >
          {repTimesMs.map((_, i) => (
            <Pressable
              key={i}
              onPress={() => seekToRep(i)}
              style={{
                minWidth: 40, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 12,
                alignItems: 'center', justifyContent: 'center',
                backgroundColor: activeRep === i ? T.accent : 'rgba(255,255,255,0.06)',
                borderWidth: 1, borderColor: activeRep === i ? T.accent : T.line2,
              }}
            >
              <Text
                style={{
                  fontFamily: wfont(700), fontSize: 14, fontVariant: ['tabular-nums'],
                  color: activeRep === i ? T.accentInk : T.text,
                }}
              >
                {i + 1}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}
