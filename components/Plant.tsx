import { useEffect, useState } from "react";
import { AccessibilityInfo, Animated, Easing, View } from "react-native";
import Svg, { Ellipse, Path, Circle, G } from "react-native-svg";
import { theme } from "../constants/theme";
const names = [
  "Семечко",
  "Росток",
  "Маленькое растение",
  "Растущее растение",
  "Большое растение",
  "Цветение",
];
export function Plant({
  stage = 0,
  pulse = "",
  shared = false,
}: {
  stage?: number;
  pulse?: string;
  shared?: boolean;
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
