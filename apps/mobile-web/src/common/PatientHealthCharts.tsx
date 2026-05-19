import React, { useMemo } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import Svg, { Circle, Line, Polyline, Text as SvgText } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';

type MedicalRecord = {

  id: string;
  title: string | null;
  blood_pressure: string | null;
  heart_rate: number | null;
  temperature: number | null;
  weight_kg: number | null;
  height_cm: number | null;
  created_at: string | null;

};

type ChartPoint = {

  label: string;
  value: number;

};

function formatDate(value: string | null) {

  if (!value) 
    return 'N/A';

  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', });

}

function parseBloodPressure(value: string | null) {
  
  if (!value) 
    return null;

  const match = value.match(/(\d+)\s*\/\s*(\d+)/);
  if (!match) 
    return null;

  return { systolic: Number(match[1]), diastolic: Number(match[2]), };

}

function buildPoints( records: MedicalRecord[], getValue: (record: MedicalRecord) => number | null | undefined ): ChartPoint[] {

  return records
    .filter((record) => getValue(record) !== null && getValue(record) !== undefined)
    .sort((a, b) => { 
        const dateA = new Date(a.created_at || '').getTime(); 
        const dateB = new Date(b.created_at || '').getTime();
      return dateA - dateB;
    })
    .map((record) => ({ label: formatDate(record.created_at), value: Number(getValue(record)), }))
    .filter((point) => Number.isFinite(point.value));

}

function MiniLineChart({ points, color, suffix, }: { points: ChartPoint[]; color: string; suffix?: string; }) {

  const width = 280;
  const height = 150;
  const padding = 28;

  if (points.length < 2) {
    return (
      <View style={styles.chartEmpty}>
        <Ionicons name="analytics-outline" size={22} color="#94A3B8"/>
        <Text style={styles.chartEmptyText}>Not enough data yet.</Text>
      </View>
    );
  }

  const values = points.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const coordinates = points.map((point, index) => {
    const x = padding + (index / Math.max(points.length - 1, 1)) * (width - padding * 2);
    const y = height - padding - ((point.value - min) / range) * (height - padding * 2);
    return { x, y, point };
  });

  const polylinePoints = coordinates.map((item) => `${item.x},${item.y}`).join(' ');

  return (

    <View style={styles.chartWrap}>

      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        <Line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#CBD5E1" strokeWidth="1"/>
        <Line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#CBD5E1" strokeWidth="1"/>
        <SvgText x={padding} y={padding - 8} fontSize="10" fill="#64748B" fontWeight="700">{max}{suffix || ''}</SvgText>
        <SvgText x={padding} y={height - 8} fontSize="10" fill="#64748B" fontWeight="700">{min}{suffix || ''}</SvgText>
        <Polyline points={polylinePoints} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
        {coordinates.map((item, index) => (<Circle key={`${item.point.label}-${index}`} cx={item.x} cy={item.y} r="4" fill={color} />))}
      </Svg>

      <View style={styles.chartLabels}>
        <Text style={styles.chartLabel}>{points[0]?.label}</Text>
        <Text style={styles.chartLabel}>{points[points.length - 1]?.label}</Text>
      </View>
    
    </View>

  );

}

function ChartCard({ title, icon, value, children, }: { title: string; icon: keyof typeof Ionicons.glyphMap; value: string; children: React.ReactNode; }) {

  return (
    <View style={styles.chartCard}>
      <View style={styles.chartHeader}>
        <View style={styles.chartHeaderLeft}>
          <Ionicons name={icon} size={18} color="#64748B"/>
          <Text style={styles.chartTitle}>{title}</Text>
        </View>
        <Text style={styles.latestValue}>{value}</Text>
      </View>
      {children}
    </View>
  );

}

export default function PatientHealthCharts({
  records,
  primaryColor,
  chartInsights = [],
  generatingInsights = false,
  onGenerateInsights,
}: {
  records: MedicalRecord[];
  primaryColor: string;
  chartInsights?: string[];
  generatingInsights?: boolean;
  onGenerateInsights?: () => void;
}) {

  const heartRatePoints = useMemo( () => buildPoints(records, (record) => record.heart_rate), [records] );
  const temperaturePoints = useMemo( () => buildPoints(records, (record) => record.temperature), [records] );
  const weightPoints = useMemo( () => buildPoints(records, (record) => record.weight_kg), [records] );
  const systolicPoints = useMemo( () => buildPoints(records, (record) => { const bp = parseBloodPressure(record.blood_pressure); return bp?.systolic; }), [records] );
  const latestHeartRate = heartRatePoints.at(-1)?.value;
  const latestTemperature = temperaturePoints.at(-1)?.value;
  const latestWeight = weightPoints.at(-1)?.value;
  const latestSystolic = systolicPoints.at(-1)?.value;

  if (!records.length) {
    return (
      <View style={styles.emptyCard}>
        <Ionicons name="analytics-outline" size={24} color="#94A3B8"/>
        <Text style={styles.emptyTitle}>No chart data yet</Text>
        <Text style={styles.emptyText}>Charts will appear after medical records include measurements.</Text>
      </View>
    );
  }

  return (

    <View style={styles.container}>

      <ChartCard title="Heart Rate" icon="pulse-outline" value={latestHeartRate ? `${latestHeartRate} bpm` : 'Not set'}>
        <MiniLineChart points={heartRatePoints} color={primaryColor} suffix=""/>
      </ChartCard>

      <ChartCard title="Temperature" icon="thermometer-outline" value={latestTemperature ? `${latestTemperature}°C` : 'Not set'}>
        <MiniLineChart points={temperaturePoints} color={primaryColor} suffix="°"/>
      </ChartCard>

      <ChartCard title="Weight" icon="scale-outline" value={latestWeight ? `${latestWeight} kg` : 'Not set'}>
        <MiniLineChart points={weightPoints} color={primaryColor} suffix="kg"/>
      </ChartCard>

      <ChartCard title="Blood Pressure" icon="heart-outline" value={latestSystolic ? `${latestSystolic} systolic` : 'Not set'}>
        <MiniLineChart points={systolicPoints} color={primaryColor} suffix=""/>
      </ChartCard>

      <View style={styles.aiInsightsCard}>
        <View style={styles.aiInsightsHeader}>
          <Ionicons name="sparkles-outline" size={18} color={primaryColor} />
          <Text style={styles.aiInsightsTitle}>AI Chart Insights</Text>
        </View>

        {chartInsights.length > 0 ? (
          chartInsights.map((insight, index) => (
            <Text key={`chart-insight-${index}`} style={styles.aiInsightItem}>
              • {insight}
            </Text>
          ))
        ) : (
          <Text style={styles.aiInsightEmpty}>
            No AI chart insights generated yet.
          </Text>
        )}

        <Pressable
          style={[styles.aiInsightButton, { backgroundColor: primaryColor }]}
          onPress={onGenerateInsights}
          disabled={generatingInsights || !onGenerateInsights}
        >
          <Ionicons name="sparkles-outline" size={16} color="#FFFFFF" />
          <Text style={styles.aiInsightButtonText}>
            {generatingInsights ? 'Generating...' : 'Generate AI Chart Insights'}
          </Text>
        </Pressable>

        <Text style={styles.aiInsightDisclaimer}>
          AI insights are informational and must be reviewed by a clinician.
        </Text>
      </View>

    </View>
  
    );

}

const styles = StyleSheet.create({

  container: {
    gap: 14,
  },

  chartCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    padding: 16,
    gap: 12,
  },

  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },

  chartHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },

  chartTitle: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '900',
  },

  latestValue: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '900',
  },

  chartWrap: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 8,
    paddingHorizontal: 8,
  },

  chartLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: -4,
  },

  chartLabel: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '800',
  },

  chartEmpty: {
    minHeight: 110,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  chartEmptyText: {
    color: '#94A3B8',
    fontWeight: '800',
    fontSize: 13,
  },

  emptyCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    padding: 18,
    alignItems: 'center',
  },

  emptyTitle: {
    marginTop: 8,
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '900',
  },

  emptyText: {
    marginTop: 5,
    color: '#64748B',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 20,
  },

  aiInsightsCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    padding: 16,
    gap: 10,
  },

  aiInsightsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  aiInsightsTitle: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '900',
  },

  aiInsightItem: {
    color: '#64748B',
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '700',
  },

  aiInsightEmpty: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '800',
  },

  aiInsightButton: {
    minHeight: 46,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },

  aiInsightButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 13,
  },

  aiInsightDisclaimer: {
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
  },

});