import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';

// material-ui
import { Grid, Typography } from '@mui/material';

// third-party
import Chart from 'react-apexcharts';

// project imports
import SkeletonTotalGrowthBarChart from 'ui-component/cards/Skeleton/TotalGrowthBarChart';
import MainCard from 'ui-component/cards/MainCard';
import { gridSpacing } from 'store/constant';
import { Box } from '@mui/material';

// ==============================|| DASHBOARD - HOURLY TOKEN CHART ||============================== //

const PROMPT_RATIO = 0.35; // approximate ratio for prompt tokens
const COMPLETION_RATIO = 0.65; // approximate ratio for completion tokens

const chartOptions = {
  height: 320,
  type: 'bar',
  options: {
    colors: ['#8884d8', '#82ca9d'],
    chart: {
      id: 'hourly-token-chart',
      toolbar: {
        show: true
      },
      zoom: {
        enabled: true
      },
      background: 'transparent'
    },
    responsive: [
      {
        breakpoint: 480,
        options: {
          legend: {
            position: 'bottom',
            offsetX: -10,
            offsetY: 0
          }
        }
      }
    ],
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: '60%',
        endingShape: 'rounded'
      }
    },
    xaxis: {
      type: 'category',
      categories: Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`),
      labels: {
        style: {
          fontSize: '12px',
          fontFamily: "'Roboto', sans-serif"
        },
        rotate: 0,
        hideOverlappingLabels: true
      }
    },
    legend: {
      show: true,
      fontSize: '14px',
      fontFamily: "'Roboto', sans-serif",
      position: 'bottom',
      offsetX: 0,
      labels: {
        useSeriesColors: false
      },
      markers: {
        width: 12,
        height: 12,
        radius: 3
      },
      itemMargin: {
        horizontal: 10,
        vertical: 5
      }
    },
    fill: {
      type: 'solid'
    },
    dataLabels: {
      enabled: false
    },
    grid: {
      show: true,
      borderColor: '#e0e0e0',
      strokeDashArray: 3
    },
    tooltip: {
      theme: 'dark',
      y: {
        formatter: function (val) {
          return val.toLocaleString() + ' tokens';
        }
      }
    },
    yaxis: {
      labels: {
        formatter: function (val) {
          if (val >= 1000000) return (val / 1000000).toFixed(1) + 'M';
          if (val >= 1000) return (val / 1000).toFixed(1) + 'K';
          return val;
        },
        style: {
          fontSize: '12px'
        }
      }
    }
  },
  series: []
};

const HourlyTokenChart = ({ isLoading }) => {
  const [chartData, setChartData] = useState(null);
  const [todayTotal, setTodayTotal] = useState({ token: 0, request: 0 });

  const fetchHourlyData = async () => {
    try {
      const res = await fetch('/api/user/dashboard/hourly', {
        credentials: 'include'
      });
      const json = await res.json();
      if (json.success && json.data) {
        const hourly = json.data.hourly || [];
        // Estimate prompt vs completion split using ratio
        const promptData = hourly.map((h) => Math.round(h.TokenCount * PROMPT_RATIO));
        const completionData = hourly.map((h) => Math.round(h.TokenCount * COMPLETION_RATIO));
        setChartData({
          ...chartOptions,
          series: [
            { name: 'Prompt Tokens', data: promptData },
            { name: 'Completion Tokens', data: completionData }
          ]
        });
        if (json.data.today_total) {
          setTodayTotal(json.data.today_total);
        }
      }
    } catch (err) {
      console.error('Failed to fetch hourly data:', err);
    }
  };

  useEffect(() => {
    fetchHourlyData();
    const interval = setInterval(fetchHourlyData, 5 * 60 * 1000); // refresh every 5 minutes
    return () => clearInterval(interval);
  }, []);

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toLocaleString();
  };

  if (isLoading) {
    return <SkeletonTotalGrowthBarChart />;
  }

  return (
    <MainCard>
      <Grid container spacing={gridSpacing}>
        <Grid item xs={12}>
          <Grid container alignItems="center" justifyContent="space-between">
            <Grid item>
              <Typography variant="h3">今日分小时 Token 消耗</Typography>
            </Grid>
            <Grid item>
              <Typography variant="body2" color="textSecondary">
                今日总计：{formatNumber(todayTotal.token)} tokens | {formatNumber(todayTotal.request)} 次请求
              </Typography>
            </Grid>
          </Grid>
        </Grid>
        <Grid item xs={12}>
          {chartData && chartData.series.length > 0 ? (
            <Chart {...chartData} />
          ) : (
            <Box
              sx={{
                minHeight: '320px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Typography variant="h3" color={'#697586'}>
                暂无数据
              </Typography>
            </Box>
          )}
        </Grid>
      </Grid>
    </MainCard>
  );
};

HourlyTokenChart.propTypes = {
  isLoading: PropTypes.bool
};

export default HourlyTokenChart;
