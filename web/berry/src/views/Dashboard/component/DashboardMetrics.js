import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';

// material-ui
import { Box, Grid, Typography } from '@mui/material';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import EarningCard from 'ui-component/cards/Skeleton/EarningCard';
import { gridSpacing } from 'store/constant';
import { calculateQuota, renderNumber } from 'utils/common';

// ==============================|| DASHBOARD - METRICS CARDS ||============================== //

const formatValue = (value, type) => {
  if (value === undefined || value === null) return '0';
  switch (type) {
    case 'quota':
      return '$' + calculateQuota(value);
    case 'number':
    default:
      return renderNumber(value);
  }
};

const MetricCard = ({ title, value, icon, color, isLoading }) => {
  if (isLoading) {
    return <EarningCard />;
  }

  return (
    <MainCard>
      <Grid container direction="column" sx={{ height: '100%' }}>
        <Grid item sx={{ flexGrow: 1 }}>
          <Grid container justifyContent="space-between" alignItems="flex-start">
            <Grid item>
              <Typography
                variant="body2"
                color="textSecondary"
                sx={{ mb: 1, fontSize: '0.875rem', fontWeight: 500 }}
              >
                {title}
              </Typography>
            </Grid>
            {icon && (
              <Grid item>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: color + '20',
                    color: color
                  }}
                >
                  {icon}
                </Box>
              </Grid>
            )}
          </Grid>
        </Grid>
        <Grid item>
          <Typography
            variant="h3"
            sx={{
              fontWeight: 600,
              fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2rem' },
              lineHeight: 1.2
            }}
          >
            {value || '0'}
          </Typography>
        </Grid>
      </Grid>
    </MainCard>
  );
};

MetricCard.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  icon: PropTypes.node,
  color: PropTypes.string,
  isLoading: PropTypes.bool
};

const DashboardMetrics = ({ isLoading: parentLoading }) => {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    requests: 0,
    quota: 0,
    tokens: 0,
    activeModels: 0
  });

  const fetchMetrics = async () => {
    try {
      const [hourlyRes, topModelsRes] = await Promise.all([
        fetch('/api/user/dashboard/hourly', { credentials: 'include' }),
        fetch('/api/user/dashboard/top-models', { credentials: 'include' })
      ]);

      const hourlyJson = await hourlyRes.json();
      const topModelsJson = await topModelsRes.json();

      const todayTotal = hourlyJson?.data?.today_total || {};
      const topModels = topModelsJson?.data?.top_models || [];

      setMetrics({
        requests: todayTotal.request || 0,
        quota: todayTotal.quota || 0, // quota字段，可能为0或undefined
        tokens: todayTotal.token || 0,
        activeModels: topModels.length || 0
      });
    } catch (err) {
      console.error('Failed to fetch dashboard metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!parentLoading) {
      fetchMetrics();
      const interval = setInterval(fetchMetrics, 5 * 60 * 1000); // refresh every 5 minutes
      return () => clearInterval(interval);
    }
  }, [parentLoading]);

  const isLoading = parentLoading || loading;

  return (
    <Grid item xs={12}>
      <Grid container spacing={gridSpacing}>
        <Grid item xs={6} lg={3}>
          <MetricCard
            title="今日请求"
            value={formatValue(metrics.requests, 'number')}
            isLoading={isLoading}
          />
        </Grid>
        <Grid item xs={6} lg={3}>
          <MetricCard
            title="今日配额消耗"
            value={formatValue(metrics.quota, 'quota')}
            isLoading={isLoading}
          />
        </Grid>
        <Grid item xs={6} lg={3}>
          <MetricCard
            title="今日 Token"
            value={formatValue(metrics.tokens, 'number')}
            isLoading={isLoading}
          />
        </Grid>
        <Grid item xs={6} lg={3}>
          <MetricCard
            title="活跃模型数"
            value={formatValue(metrics.activeModels, 'number')}
            isLoading={isLoading}
          />
        </Grid>
      </Grid>
    </Grid>
  );
};

DashboardMetrics.propTypes = {
  isLoading: PropTypes.bool
};

export default DashboardMetrics;
