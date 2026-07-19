import { Svg, G, Path, Circle } from "@react-pdf/renderer";

/**
 * Тот же логотип-бабочка, что и в CRM (components/logo.tsx), но нарисованный
 * примитивами @react-pdf/renderer — DOM-компонент <svg> внутри PDF не
 * отрисуется, у React-PDF свой рендерер с собственными тегами.
 *
 * Координаты путей — один в один с LogoMark, чтобы бабочка в документе
 * не отличалась от той, что в меню и на экране входа.
 */
export function RamTechLogoPdf({ size = 32, color = "#a78bfa" }: { size?: number; color?: string }) {
  return (
    <Svg viewBox="0 0 64 64" width={size} height={size}>
      <G stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M31 30C24 16 14 12 8 13c-1 7 1 18 9 24 5 4 11 3 14-1" />
        <Path d="M33 30c7-14 17-18 23-17 1 7-1 18-9 24-5 4-11 3-14-1" />
        <Path d="M32 22v26" />
        <Path d="M32 22l-4-7M32 22l4-7" />
        <Circle cx={27.4} cy={14.2} r={1.8} fill={color} />
        <Circle cx={36.6} cy={14.2} r={1.8} fill={color} />
        <Path d="M14 22h6l4 4h5" />
        <Circle cx={12.6} cy={22} r={1.8} fill={color} />
        <Path d="M50 22h-6l-4 4h-5" />
        <Circle cx={51.4} cy={22} r={1.8} fill={color} />
        <Path d="M18 38l4-4h6" />
        <Circle cx={16.6} cy={38} r={1.8} fill={color} />
        <Path d="M46 38l-4-4h-6" />
        <Circle cx={47.4} cy={38} r={1.8} fill={color} />
      </G>
    </Svg>
  );
}
