import { useEffect, useState } from "react";
import { AccessibilityInfo, Animated, Easing, View } from "react-native";
import Svg, { Ellipse, Path, Circle, G, Rect } from "react-native-svg";
import { theme } from "../constants/theme";
const names = [
  "Семечко",
  "Росток",
  "Маленькое растение",
  "Растущее растение",
  "Большое растение",
  "Цветение",
];

function WateringAnimation({ signal, reduce }: { signal: string; reduce: boolean }) {
  const [tilt] = useState(() => new Animated.Value(0));
  const [drop] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (!signal) return;
    tilt.setValue(0);
    drop.setValue(0);
    if (reduce) return;
    const animation = Animated.parallel([
      Animated.sequence([
        Animated.timing(tilt, {
          toValue: 1,
          duration: 360,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.delay(1250),
        Animated.timing(tilt, {
          toValue: 0,
          duration: 360,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.loop(
        Animated.sequence([
          Animated.timing(drop, {
            toValue: 1,
            duration: 430,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(drop, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
        { iterations: 4 },
      ),
    ]);
    animation.start();
    return () => animation.stop();
  }, [drop, reduce, signal, tilt]);
  if (!signal) return null;
  return (
    <>
      <Animated.View
        pointerEvents="none"
        style={{
          position: "absolute",
          right: 3,
          top: 42,
          zIndex: 4,
          transform: [{
            rotate: tilt.interpolate({ inputRange: [0, 1], outputRange: ["4deg", "-20deg"] }),
          }],
        }}
      >
        <Svg width="92" height="70" viewBox="0 0 92 70">
          <Path d="M35 27 9 15 5 22 35 40Z" fill={theme.leaf} />
          <Path d="M8 15 2 12 1 18 5 22Z" fill={theme.accent} />
          <Rect x="33" y="21" width="42" height="36" rx="9" fill={theme.accent} />
          <Path d="M69 26 C91 15 94 53 74 54" fill="none" stroke={theme.leaf} strokeWidth="7" />
          <Path d="M42 21 Q54 10 65 21" fill="none" stroke={theme.soil} strokeWidth="4" />
          <Circle cx="52" cy="39" r="5" fill={theme.pale} opacity={0.75} />
        </Svg>
      </Animated.View>
      {!reduce && (
        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            right: 77,
            top: 94,
            opacity: drop.interpolate({
              inputRange: [0, 0.12, 0.82, 1],
              outputRange: [0, 1, 0.9, 0],
            }),
            transform: [{
              translateY: drop.interpolate({ inputRange: [0, 1], outputRange: [0, 58] }),
            }],
          }}
        >
          <Svg width="42" height="34" viewBox="0 0 42 34">
            <Path d="M7 2 C2 10 2 15 7 15 C12 15 12 10 7 2Z" fill="#78AFC5" />
            <Path d="M21 0 C15 10 15 16 21 16 C27 16 27 10 21 0Z" fill="#78AFC5" />
            <Path d="M35 4 C30 12 30 17 35 17 C40 17 40 12 35 4Z" fill="#78AFC5" />
          </Svg>
        </Animated.View>
      )}
    </>
  );
}

export function Plant({
  stage = 0,
  pulse = "",
  shared = false,
  watering = "",
}: {
  stage?: number;
  pulse?: string;
  shared?: boolean;
  watering?: string;
}) {
  const [scale] = useState(() => new Animated.Value(1));
  const [sway] = useState(() => new Animated.Value(0));
  const [reduce, setReduce] = useState(true);
  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduce);
    const sub = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduce,
    );
    return () => sub.remove();
  }, []);
  useEffect(() => {
    if (reduce) {
      sway.setValue(0);
      return;
    }
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(sway, {
          toValue: 1,
          duration: 3500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(sway, {
          toValue: -1,
          duration: 3500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [reduce, sway]);
  useEffect(() => {
    if (!pulse || reduce) return;
    const animation = Animated.sequence([
      Animated.timing(scale, {
        toValue: 1.035,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [pulse, reduce, scale]);
  const height = 70 + stage * 24;
  return (
    <View
      accessible
      accessibilityLabel={`Общее растение: ${names[stage] ?? names[0]}`}
      style={{ alignItems: "center", paddingVertical: 12 }}
    >
      <Animated.View
        style={{
          width: 280,
          height: 310,
          transform: [
            { scale },
            {
              rotate: sway.interpolate({
                inputRange: [-1, 1],
                outputRange: ["-1deg", "1deg"],
              }),
            },
          ],
        }}
      >
        <WateringAnimation signal={watering} reduce={reduce} />
        <Svg width="280" height="310" viewBox="0 0 280 310">
          <Circle
            cx="140"
            cy="150"
            r="115"
            fill={shared ? theme.pale : theme.surface}
            opacity={0.65}
          />
          <Ellipse
            cx="140"
            cy="284"
            rx="62"
            ry="8"
            fill={theme.border}
            opacity={0.5}
          />
          <Path
            d="M106 240 L114 277 Q140 290 166 277 L174 240Z"
            fill={theme.soil}
          />
          <Ellipse
            cx="140"
            cy="240"
            rx="34"
            ry="8"
            fill={theme.text}
            opacity={0.7}
          />
          {stage === 0 ? (
            <G>
              <Ellipse cx="140" cy="232" rx="9" ry="7" fill={theme.leaf} />
              <Path
                d="M140 232 Q144 217 153 213"
                stroke={theme.accent}
                strokeWidth="3"
                fill="none"
              />
            </G>
          ) : (
            <G>
              <Path
                d={`M140 239 Q128 ${240 - height / 2} 143 ${240 - height}`}
                stroke={theme.accent}
                strokeWidth="4"
                strokeLinecap="round"
                fill="none"
              />
              {Array.from({ length: stage + 1 }, (_, i) => {
                const y = 217 - i * 25;
                const left = i % 2 === 0;
                return (
                  <Path
                    key={i}
                    d={
                      left
                        ? `M138 ${y} Q88 ${y + 1} 91 ${y - 34} Q130 ${y - 40} 138 ${y}`
                        : `M137 ${y} Q185 ${y + 4} 192 ${y - 31} Q154 ${y - 38} 137 ${y}`
                    }
                    fill={i % 2 ? theme.leaf : theme.accent}
                  />
                );
              })}
              {(stage === 5 || shared) && (
                <G>
                  {[0, 72, 144, 216, 288].map((angle) => (
                    <Ellipse
                      key={angle}
                      cx="143"
                      cy={225 - height}
                      rx="9"
                      ry="16"
                      fill={theme.flower}
                      transform={`rotate(${angle} 143 ${240 - height})`}
                    />
                  ))}
                  <Circle cx="143" cy={240 - height} r="7" fill={theme.soil} />
                </G>
              )}
            </G>
          )}
        </Svg>
      </Animated.View>
    </View>
  );
}
