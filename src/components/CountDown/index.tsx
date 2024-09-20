import './style.scss';
import React, { useLayoutEffect, useMemo } from 'react';
import {
  dashboard,
  bitable,
  DashboardState,
  IConfig,
  base,
} from '@lark-base-open/js-sdk';
// import { Button, DatePicker, ConfigProvider, Checkbox, Row, Col, Input, Switch, Select as DySelect } from '@douyinfe/semi-ui';
import { DatePicker } from '@douyinfe/semi-ui';
import { Button, Checkbox, Row, Col, Input, Switch, Select } from 'antd';
import { useState, useEffect, useRef, useCallback } from 'react';
import { getTime } from './utils';
import { useConfig } from '../../hooks';
import dayjs from 'dayjs';
import classnames from 'classnames';
import { useTranslation } from 'react-i18next';
import { TFunction } from 'i18next/typescript/t';
import { ColorPicker } from '../ColorPicker';
import { Item } from '../Item';
import { YwTable } from '@ywfe/yw-design';

/** 符合convertTimestamp的日期格式 */
const titleDateReg = /\d{4}-\d{1,2}-\d{1,2}\s\d+:\d+:\d{1,2}/;

interface ICountDownConfig {
  color: string;
  /** 毫秒级时间戳 */
  target: number;
  units: string[];
  othersConfig: string[];
  title: string;
  showTitle: boolean;
  /** 是否显示倒计时 */
  showCountDown: boolean;
}

const othersConfigKey: { key: string; title: string }[] = [];

const defaultOthersConfig = ['showTitle'];

const getAvailableUnits: (t: TFunction<'translation', undefined>) => {
  [p: string]: { title: string; unit: number; order: number };
} = (t) => {
  return {
    sec: {
      title: t('second'),
      unit: 1,
      order: 1,
    },
    min: {
      title: t('minute'),
      unit: 60,
      order: 2,
    },
    hour: {
      title: t('hour'),
      unit: 60 * 60,
      order: 3,
    },
    day: {
      title: t('day'),
      unit: 60 * 60 * 24,
      order: 4,
    },
    week: {
      title: t('week'),
      unit: 60 * 60 * 24 * 7,
      order: 5,
    },
    month: {
      title: t('month'),
      unit: 60 * 60 * 24 * 30,
      order: 6,
    },
  };
};

const defaultUnits = ['sec', 'min', 'hour', 'day'];

/** 插件主体 */
export default function CountDown() {
  const { t, i18n } = useTranslation();

  // create时的默认配置
  const [config, setConfig] = useState<ICountDownConfig>({
    target: new Date().getTime(),
    color: 'var(--ccm-chart-N700)',
    units: defaultUnits,
    title: t('target.remain'),
    showTitle: false,
    showCountDown: true,
    othersConfig: defaultOthersConfig,
  });
  const [tableList, setTableList] = useState<any[]>([]);
  const [tableFileds, setTableFileds] = useState<any[]>([]);
  const log = console.log.bind(console);

  const availableUnits = useMemo(() => getAvailableUnits(t), [i18n.language]);

  /** 是否配置/创建模式下 */
  const isCreate = dashboard.state === DashboardState.Create;
  const isConfig = dashboard.state === DashboardState.Config || isCreate;
  const isView = dashboard.state === DashboardState.View;

  const timer = useRef<any>();

  /** 配置用户配置 */
  const updateConfig = (res: IConfig) => {
    if (timer.current) {
      clearTimeout(timer.current);
    }
    const { customConfig } = res;
    if (customConfig) {
      setConfig(customConfig as any);
      timer.current = setTimeout(() => {
        //自动化发送截图。 预留3s给浏览器进行渲染，3s后告知服务端可以进行截图了（对域名进行了拦截，此功能仅上架部署后可用）。
        dashboard.setRendered();
      }, 3000);
    }
  };

  useConfig(updateConfig);

  const getData = async () => {
    log(
      `===================== dashboard 状态: ${dashboard.state}  =====================`
    );
    if (
      dashboard.state === DashboardState.Config ||
      dashboard.state === DashboardState.Create
    ) {
      const tableList: any = await base.getTableList();
      log('tableList=>', tableList);
      setTableList([...(tableList || [])]);
      const tableCategories = await dashboard.getCategories(tableList[0].id);
      setTableFileds([...(tableCategories || [])]);
      log('tableCategories=>', tableCategories);
      const ranges = await dashboard.getTableDataRange(tableList[0].id);
      const preData = await dashboard.getPreviewData({
        tableId: tableList[0].id,
        dataRange: ranges[0],
      });
      log('preData=>', preData);
    }

    if (dashboard.state === DashboardState.View) {
      const tableList = await base.getTableList();
      log('view tableList=>', tableList);
      setTableList([...(tableList || [])]);
      const tableCategories = await dashboard.getCategories(tableList[0].id);
      setTableFileds([...(tableCategories || [])]);
      log('view tableCategories=>', tableCategories);
      const tableData = await dashboard.getData();
      log('tableData=>', tableData);
      //通过tableId获取table数据表。 Find current table by tableId
      const table = await bitable.base.getTableById(tableList[0].id);
      //获取table数据表的字段列表元信息。Get table's field meta list
      const fieldMetaList = await table.getFieldMetaList();
      log('table==>', table, '\r\nfieldMetaList=>', fieldMetaList);
      //获取table的所有记录的ID。 Get all records
      // const recordIdList = await table.getRecordIdList();
      // log('recordIdList=>', recordIdList);
      // 获取table的所有记录。 Get all records
      const records = await table.getRecords({ pageSize: 5000 });
      log('records=>', records);
    }
  };

  useEffect(() => {
    getData();
  }, [dashboard.state]);

  useEffect(() => {
    if (isCreate) {
      setConfig({
        target: new Date().getTime(),
        color: 'var(--ccm-chart-N700)',
        units: defaultUnits,
        title: t('target.remain'),
        showTitle: false,
        showCountDown: true,
        othersConfig: defaultOthersConfig,
      });
    }
  }, [i18n.language, isCreate]);

  return (
    <main
      className={classnames({
        'main-config': isConfig,
        main: true,
      })}
    >
      <div className="content">
        <CountdownView
          t={t}
          availableUnits={availableUnits}
          config={config}
          key={config.target}
          isConfig={isConfig}
        />
      </div>
      {isConfig ? (
        <ConfigPanel
          t={t}
          config={config}
          setConfig={setConfig}
          availableUnits={availableUnits}
          tableList={tableList}
          tableFileds={tableFileds}
        />
      ) : null}
    </main>
  );
}

interface ICountdownView {
  config: ICountDownConfig;
  isConfig: boolean;
  t: TFunction<'translation', undefined>;
  availableUnits: ReturnType<typeof getAvailableUnits>;
}
function CountdownView({
  config,
  isConfig,
  availableUnits,
  t,
}: ICountdownView) {
  const { units, target, color, title } = config;
  const [time, setTime] = useState(target ?? 0);
  useEffect(() => {
    const timer = setInterval(() => {
      setTime((time) => {
        return time - 1;
      });
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, []);

  const timeCount = getTime({
    target: target,
    units: units.map((v) => availableUnits[v]),
  });

  if (time <= 0) {
    return (
      <div
        style={{
          fontSize: 26,
        }}
      >
        {t('please.config')}
      </div>
    );
  }

  const numbers = timeCount.units
    .sort((a, b) => b.unit - a.unit)
    .map(({ count, title }) => {
      return (
        <div key={title}>
          <div
            className={classnames('number', {
              'number-config': isConfig,
            })}
          >
            {count}
          </div>
          <div
            className={classnames('number-title', {
              'number-title-config': isConfig,
            })}
          >
            {title}{' '}
          </div>
        </div>
      );
    });

  const columns = [
    {
      title: '标题',
      dataIndex: 'title',
      component: 'LongText2Ellipsis', // 长文本两行换行
      componentProps: {
        tooltip: true, // 是否需要tooltip 默认false
      },
      width: 300,
    },
    {
      title: '摘要',
      dataIndex: 'group',
      component: 'MultipleCol',
      // 数据聚合成新的字段group
      formatValues: (_: any, record: any) => {
        return [
          {
            label: '人员',
            value: record.person,
          },
          {
            label: '事项',
            value: record.event,
          },
          {
            label: '时间',
            value: record.time,
          },
        ];
      },
      width: 260,
    },
    {
      title: '发起人',
      dataIndex: 'personInfo',
      width: 260,
      component: 'Person',
      componentProps: {
        onClick: (record: any) => {
          console.log(record);
        },
      },
      // 字段映射
      formatValues: (_: any, record: any) => {
        return {
          avatar: record.personUrl,
          name: record.person,
        };
      },
    },
    {
      title: '发起时间',
      dataIndex: 'startTime',
      component: 'Time',
      width: 260,
    },
  ];

  const tableButtons = [
    {
      type: 'batch',
      btnText: '批量选中',
      onClick: (keys: any, data: any, reload: any) => {
        console.log(keys, data);
        setTimeout(reload(), 1000);
      },
    },
    {
      type: 'batch',
      btnText: '设置状态',
      btnType: 'dropdown',
      onClick: (key: any, selectKeys: any, selectData: any, reload: any) => {
        console.log(key, selectKeys, selectData, reload);
      },
      dataSource: [
        {
          label: '批量开启',
          key: '1',
        },
        {
          label: '批量关闭',
          key: '2',
        },
      ],
    },
    {
      type: 'batch',
      btnText: '批量退回',
      visible: false,
    },
    {
      type: 'action',
      btnText: '导出',
    },
    {
      type: 'action',
      btnText: '新建',
      btnType: 'primary',
    },
  ];

  return (
    <div style={{ width: '100vw', textAlign: 'center', overflow: 'hidden' }}>
      {/* 倒计时 */}
      {config.showCountDown ? (
        <>
          <div>
            {config.showTitle ? (
              <p
                style={{ color }}
                className={classnames('count-down-title', {
                  'count-down-title-config': isConfig,
                })}
              >
                {title.replaceAll(
                  /\{\{\s*time\s*\}\}/g,
                  convertTimestamp(target * 1000)
                )}
              </p>
            ) : null}
            <div className="number-container" style={{ color }}>
              <div className="number-container-row">
                {numbers.slice(0, Math.ceil(numbers.length / 2))}
              </div>
              <div className="number-container-row">
                {numbers.slice(Math.ceil(numbers.length / 2))}
              </div>
            </div>
          </div>
        </>
      ) : null}
      {/* 表格区域 */}
      <YwTable
        columns={columns}
        showTotal
        rowKey="id"
        // getTableData={getTableData}
        // filterProps={filterProps}
        buttons={tableButtons}
        rowSelection={{}}
        pagination={{ showQuickJumper: true, pageSize: 10 }}
        dataSource={[]}
      />
    </div>
  );
}

/** 格式化显示时间 */
function convertTimestamp(timestamp: number) {
  return dayjs(timestamp / 1000).format('YYYY-MM-DD HH:mm:ss');
}

function ConfigPanel(props: {
  config: ICountDownConfig;
  tableList: any[];
  tableFileds: any[];
  setConfig: React.Dispatch<React.SetStateAction<ICountDownConfig>>;
  availableUnits: ReturnType<typeof getAvailableUnits>;
  t: TFunction<'translation', undefined>;
}) {
  const { config, setConfig, availableUnits, t, tableList, tableFileds } =
    props;
  /**保存配置 */
  const onSaveConfig = () => {
    dashboard.saveConfig({
      customConfig: config,
      dataConditions: [],
    } as any);
  };

  return (
    <div className="config-panel">
      <div className="form">
        <Item
          label={
            <div className="label-checkbox">
              {t('label.display.countdown')}
              <Switch
                checked={config.showCountDown}
                onChange={(e: any) => {
                  setConfig({
                    ...config,
                    showCountDown: e ?? false,
                  });
                }}
              ></Switch>
            </div>
          }
        ></Item>
        <Item label={t('label.set.target')}>
          <DatePicker
            showClear={false}
            style={{
              width: '100%',
            }}
            value={config.target}
            type="dateTime"
            onChange={(date: any) => {
              setConfig({
                ...config,
                target: date ? new Date(date).getTime() : new Date().getTime(),
              });
            }}
          />
        </Item>

        <Item
          label={
            <div className="label-checkbox">
              {t('label.display.time')}
              <Switch
                checked={config.showTitle}
                onChange={(e) => {
                  setConfig({
                    ...config,
                    showTitle: e ?? false,
                  });
                }}
              ></Switch>
            </div>
          }
        >
          <Input
            disabled={!config.showTitle}
            value={config.title.replaceAll(
              /\{\{\s*time\s*\}\}/g,
              convertTimestamp(config.target * 1000)
            )}
            onChange={(v) =>
              setConfig({
                ...config,
                title: v.replace(titleDateReg, '{{time}}'),
              })
            }
            onBlur={(e) => {
              setConfig({
                ...config,
                title: e.target.value.replace(
                  convertTimestamp(config.target * 1000),
                  '{{time}}'
                ),
              });
            }}
          />
        </Item>

        {othersConfigKey.length ? (
          <Item label={''}>
            <Checkbox.Group
              value={config.othersConfig}
              style={{ width: '100%' }}
              onChange={(v) => {
                setConfig({
                  ...config,
                  othersConfig: v.slice(),
                });
              }}
            >
              <div className="checkbox-group">
                {othersConfigKey.map((v) => (
                  <div className="checkbox-group-item" key={v.key}>
                    <Checkbox value={v.key}>{v.title}</Checkbox>
                  </div>
                ))}
              </div>
            </Checkbox.Group>
          </Item>
        ) : null}

        <Item label={t('label.unit')}>
          <Checkbox.Group
            value={config.units}
            style={{ width: '100%' }}
            onChange={(checkedValues: string[]) => {
              setConfig({
                ...config,
                units: checkedValues,
              });
            }}
          >
            <div className="checkbox-group">
              {Object.keys(availableUnits)
                .sort(
                  (a, b) => availableUnits[b].order - availableUnits[a].order
                )
                .map((v) => (
                  <div className="checkbox-group-item" key={v}>
                    <Checkbox value={v}>{availableUnits[v].title}</Checkbox>
                  </div>
                ))}
            </div>
          </Checkbox.Group>
        </Item>

        <Item label={t('label.color')}>
          <ColorPicker
            value={config.color}
            onChange={(v) => {
              setConfig({
                ...config,
                color: v,
              });
            }}
          ></ColorPicker>
        </Item>

        {/* 表格 */}
        {tableList.length > 0 ? (
          <Item label={t('label.table')}>
            <Select
              key={`table_select_${JSON.stringify(tableList)}`}
              placeholder="请选择数据表"
              defaultValue=""
              style={{ width: '100%' }}
            >
              {tableList.map((tItem: any) => (
                <>
                  <Select.Option key={tItem.id} value={tItem.id}>
                    {tItem.id}
                  </Select.Option>
                </>
              ))}
            </Select>
          </Item>
        ) : null}
        {/* 表格字段选择 */}
        {tableFileds.length > 0 ? (
          <>
            <Item label={t('label.table.field')}>
              <Select
                key={`tableFiled_select_${JSON.stringify(tableFileds)}`}
                placeholder="请选择字段"
                defaultValue=""
                style={{ width: '100%' }}
              >
                {tableFileds.map((tfItem: any) => (
                  <>
                    <Select.Option value={tfItem.fieldId}>
                      {tfItem.fieldName}
                    </Select.Option>
                  </>
                ))}
              </Select>
            </Item>
            {tableFileds.map((tfItem: any) => (
              <>{/* <p>{tfItem.fieldId}_{tfItem.fieldName}</p> */}</>
            ))}
          </>
        ) : null}
      </div>

      <Button className="btn" theme="solid" onClick={onSaveConfig}>
        {t('confirm')}
      </Button>
    </div>
  );
}
