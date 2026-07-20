/**
 * 迅移の残像トレイル等、移動線分を距離ベースで一定間隔ごとにサンプリングする純関数(docs/03 §8)。
 * 時間ベースだと速度倍率が高いレベルで間隔がスカスカになるため距離ベースにしている。
 * 1 フレームで複数個配置されるケース(高速移動・spacing ちょうど倍数)を境界条件として想定する。
 *
 * ラン中の配列/クロージャ生成を避けるため(鉄則2)、配置点はコールバックで都度通知する
 * (呼び出し側は生成済みのコールバックを使い回すこと)。
 *
 * @param x0 線分の始点 x
 * @param y0 線分の始点 y
 * @param x1 線分の終点 x
 * @param y1 線分の終点 y
 * @param spacing 配置間隔(px)。0 以下なら何もしない
 * @param accum 直前の配置から移動済みの距離(前回呼び出しの戻り値をそのまま渡す)
 * @param onPoint 配置点ごとに呼ばれるコールバック
 * @returns 次回呼び出しに渡す accum(次の配置までの残り距離)
 */
export function stepTrailSpacing(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  spacing: number,
  accum: number,
  onPoint: (x: number, y: number) => void,
): number {
  const segDist = Math.hypot(x1 - x0, y1 - y0);
  if (segDist <= 0 || spacing <= 0) return accum;

  let remainStart = accum;
  let consumed = 0;
  while (remainStart + (segDist - consumed) >= spacing) {
    consumed += spacing - remainStart;
    const t = consumed / segDist;
    onPoint(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t);
    remainStart = 0;
  }
  return remainStart + (segDist - consumed);
}
