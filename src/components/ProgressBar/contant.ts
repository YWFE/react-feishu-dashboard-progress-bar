export const NUMBER_FORMAT_ENU = [
  {
    label: '原始值',
    value: '0',
  },
  {
    label: '千分位',
    value: '1',
  },
  {
    label: '万',
    value: '2',
  },
  {
    label: '百万',
    value: '3',
  },
  {
    label: '千万',
    value: '4',
  },
  {
    label: '亿',
    value: '5',
  },
  {
    label: '智能',
    value: '6',
  },
];


// 通用函数处理

// 处理数值为千分位
export function formatNumber(num: number, type: string, fixed: number = 0) {
  // num 非 数字 或者 字符串数字 直接返回值
  if (Number.isNaN(+num)) {
    return num;
  }
  if (type === '0') {
    return (+num).toFixed(fixed);
  }
  // 千分位展示
  if (type === '1') {
    return num.toString().replace(/\d+/, function (n) {
      return n.replace(/(\d)(?=(\d{3})+$)/g, function ($1) {
        return $1 + ',';
      });
    });
  }
  // 万展示
  if (type === '2') {
    return (num / 10000).toFixed(fixed) + '万';
  }
  // 百万展示
  if (type === '3') {
    return (num / 1000000).toFixed(fixed) + '百万';
  }
  // 千万展示
  if (type === '4') {
    return (num / 10000000).toFixed(fixed) + '千万';
  }
  // 亿展示
  if (type === '5') {
    return (num / 100000000).toFixed(fixed) + '亿';
  }
  // 智能
  if (type === '6') {
    if (num < 10000) {
      return (+num).toFixed(fixed);
    }
    if (num < 1000000) {
      return (num / 10000).toFixed(fixed) + '万';
    }
    if (num < 100000000) {
      return (num / 1000000).toFixed(fixed) + '百万';
    }
    return (num / 100000000).toFixed(fixed) + '亿';
  }
  return num;
}
