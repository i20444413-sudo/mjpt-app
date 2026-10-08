import React, { useEffect, useMemo, useState } from 'react';

import {
  Alert,
  Dimensions,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Calendar } from 'react-native-calendars';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useVideoPlayer, VideoView } from 'expo-video';
import { LineChart } from 'react-native-chart-kit';
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
const screenWidth = Dimensions.get('window').width;
const colors = {
  bg: '#F5F7FA',
  card: '#FFFFFF',
  text: '#111827',
  sub: '#6B7280',
  line: '#E5E7EB',
  accent: '#111827',
  green: '#16835B',
  red: '#C24141',
};

function Button({ title, onPress, secondary = false, disabled = false }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.button,
        secondary && styles.buttonSecondary,
        disabled && { opacity: 0.5 },
      ]}
    >
      <Text
        style={[
          styles.buttonText,
          secondary && styles.buttonTextSecondary,
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

function Card({ children }) {
  return <View style={styles.card}>{children}</View>;
}

function Header({ title, onBack }) {
  return (
    <View style={styles.header}>
      {onBack ? (
        <Pressable onPress={onBack}>
          <Text style={styles.back}>‹</Text>
        </Pressable>
      ) : (
        <View style={{ width: 25 }} />
      )}

      <Text style={styles.headerTitle}>{title}</Text>

      <View style={{ width: 25 }} />
    </View>
  );
}

function Stat({ label, value }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Login({ onLogin }) {
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [signup, setSignup] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  function normalizePhone(value) {
    let digits = value.replace(/\D/g, '');

    if (digits.startsWith('82')) {
      digits = '0' + digits.slice(2);
    }

    return digits;
  }

  function phoneToEmail(value) {
    return `${normalizePhone(value)}@phone-login.invalid`;
  }

  async function handleLogin() {
    if (busy) return;

    const cleanPhone = normalizePhone(phone);

    if (cleanPhone.length < 10) {
      Alert.alert('알림', '휴대폰 번호를 정확히 입력해주세요.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('알림', '비밀번호는 6자리 이상 입력해주세요.');
      return;
    }

    setBusy(true);

    try {
      const email = phoneToEmail(cleanPhone);

      const { data, error } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (error) {
        throw error;
      }

      if (!data?.session) {
        throw new Error('로그인 세션을 받지 못했습니다.');
      }

      onLogin(data.session);
    } catch (e) {
      console.log('로그인 오류:', e);

      Alert.alert(
        '로그인 실패',
        e?.message || '로그인 중 오류가 발생했습니다.'
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleSignup() {
    if (busy) return;

    if (!name.trim()) {
      Alert.alert('알림', '이름을 입력해주세요.');
      return;
    }

    const cleanPhone = normalizePhone(phone);

    if (cleanPhone.length < 10) {
      Alert.alert('알림', '휴대폰 번호를 정확히 입력해주세요.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('알림', '비밀번호는 6자리 이상 입력해주세요.');
      return;
    }

    setBusy(true);

    try {
      const { data, error } = await supabase.functions.invoke(
        'phone-login',
        {
          body: {
            action: 'signup',
            name: name.trim(),
            phone: cleanPhone,
            password,
          },
        }
      );

      if (error) {
        throw error;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      if (!data?.access_token || !data?.refresh_token) {
        throw new Error('로그인 세션 정보를 받지 못했습니다.');
      }

      const {
        data: sessionData,
        error: sessionError,
      } = await supabase.auth.setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      });

      if (sessionError) {
        throw sessionError;
      }

      if (!sessionData?.session) {
        throw new Error('자동 로그인에 실패했습니다.');
      }

      Alert.alert(
        '가입 완료',
        '회원가입이 완료되었습니다.'
      );

      onLogin(sessionData.session);
    } catch (e) {
      console.log('회원가입 오류:', e);

      Alert.alert(
        '가입 실패',
        e?.message || '회원가입 중 오류가 발생했습니다.'
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />

      <View style={{ flex: 1, padding: 24, justifyContent: 'center' }}>
        <Text
          style={{
            fontSize: 34,
            fontWeight: '800',
            marginBottom: 8,
          }}
        >
          이민준 PT
        </Text>

        <Text
          style={{
            fontSize: 16,
            marginBottom: 28,
          }}
        >
          {signup ? '간편 회원가입' : '로그인'}
        </Text>

        {signup && (
          <TextInput
            style={styles.input}
            placeholder="이름"
            value={name}
            onChangeText={setName}
            editable={!busy}
          />
        )}

        <TextInput
          style={styles.input}
          placeholder="휴대폰 번호"
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
          editable={!busy}
        />

        <TextInput
          style={styles.input}
          placeholder="비밀번호 6자리 이상"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          editable={!busy}
        />

        <Pressable
          disabled={busy}
          onPress={signup ? handleSignup : handleLogin}
          style={{
            backgroundColor: '#111827',
            paddingVertical: 17,
            borderRadius: 12,
            alignItems: 'center',
            marginTop: 8,
            opacity: busy ? 0.6 : 1,
          }}
        >
          <Text
            style={{
              color: '#ffffff',
              fontSize: 16,
              fontWeight: '700',
            }}
          >
            {busy
              ? '처리 중...'
              : signup
                ? '회원가입'
                : '로그인'}
          </Text>
        </Pressable>

        <Pressable
          disabled={busy}
          onPress={() => {
            setSignup((current) => !current);
            setPassword('');
          }}
          style={{
            alignItems: 'center',
            paddingVertical: 20,
          }}
        >
          <Text style={styles.switch}>
            {signup
              ? '이미 회원이신가요? 로그인'
              : '처음이신가요? 회원가입'}
          </Text>
        </Pressable>

       {signup && (
  <Text style={styles.notice}>
    별도의 휴대폰·이메일 인증 없이 바로 가입됩니다.
  </Text>
)}
      </View>
    </SafeAreaView>
  );
}

function WorkoutVideoLoader({ mediaPath }) {
  const [videoUrl, setVideoUrl] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function loadVideo() {
      const { data, error } = await supabase.storage
        .from('workout-media')
        .createSignedUrl(mediaPath, 3600);

      if (error) {
        console.log('영상 URL 오류:', error.message);
        return;
      }

      if (mounted && data?.signedUrl) {
        setVideoUrl(data.signedUrl);
      }
    }

    loadVideo();

    return () => {
      mounted = false;
    };
  }, [mediaPath]);

  if (!videoUrl) {
    return (
      <Text style={styles.sub}>
        영상 불러오는 중...
      </Text>
    );
  }

  return <WorkoutVideo url={videoUrl} />;
}

function WorkoutVideo({ url }) {
  const player = useVideoPlayer(url, (player) => {
    player.loop = false;
  });

  return (
    <VideoView
      style={{
        width: '100%',
        height: 220,
        marginTop: 12,
        borderRadius: 12,
      }}
      player={player}
      allowsFullscreen
      allowsPictureInPicture
      nativeControls
    />
  );
}
function getInbodyChange(records, field) {
  if (records.length < 2) return null;

  const current = Number(records[0]?.[field]);
  const previous = Number(records[1]?.[field]);

  if (
    Number.isNaN(current) ||
    Number.isNaN(previous)
  ) {
    return null;
  }

  return current - previous;
}

function formatInbodyChange(change) {
  if (change == null) return '';

  if (change > 0) {
    return ` ▲${change.toFixed(1)}`;
  }

  if (change < 0) {
    return ` ▼${Math.abs(change).toFixed(1)}`;
  }

  return ' ±0.0';
}

function InbodyChart({ title, records, field, unit }) {
  const chartRecords = records
    .filter((item) => {
      const value = Number(item[field]);

      return (
        item[field] != null &&
        !Number.isNaN(value)
      );
    })
    .slice(0, 6)
    .reverse();

  if (chartRecords.length < 2) {
    return (
      <Card>
        <Text style={styles.cardTitle}>
          {title}
        </Text>

        <Text style={styles.sub}>
          측정 기록이 2회 이상 쌓이면 그래프가 표시됩니다.
        </Text>
      </Card>
    );
  }

  return (
    <View style={{ marginBottom: 20 }}>
      <Text style={styles.sectionTitle}>
        {title}
      </Text>

      <LineChart
        data={{
          labels: chartRecords.map((item) => {
            const date = new Date(
              item.measured_at
            );

            return `${date.getMonth() + 1}/${date.getDate()}`;
          }),
          datasets: [
            {
              data: chartRecords.map((item) =>
                Number(item[field])
              ),
            },
          ],
        }}
        width={screenWidth - 48}
        height={220}
        yAxisSuffix={unit}
        chartConfig={{
          backgroundGradientFrom: '#FFFFFF',
          backgroundGradientTo: '#FFFFFF',
          decimalPlaces: 1,
          color: (opacity = 1) =>
            `rgba(17, 24, 39, ${opacity})`,
          labelColor: (opacity = 1) =>
            `rgba(107, 114, 128, ${opacity})`,
          propsForDots: {
            r: '4',
          },
        }}
        bezier
        style={{
          borderRadius: 16,
        }}
      />
    </View>
  );
}
function MemberHome({ profile, onLogout }) {
  const [tab, setTab] = useState('home');

  const [data, setData] = useState({
    memberships: [],
    reservations: [],
    workouts: [],
    inbody: [],
  });
const weightChange = getInbodyChange(
  data.inbody,
  'weight'
);

const muscleChange = getInbodyChange(
  data.inbody,
  'skeletal_muscle_mass'
);

const fatChange = getInbodyChange(
  data.inbody,
  'body_fat_percentage'
);
  async function load() {
    const id = profile.id;

    const [m, r, w, i] = await Promise.all([
      supabase
        .from('memberships')
        .select('*')
        .eq('member_id', id),

      supabase
        .from('reservations')
        .select('*')
        .eq('member_id', id)
        .order('start_at', { ascending: true }),

      supabase
        .from('workout_records')
        .select(`
          *,
          workout_media (
            id,
            media_type,
            media_url
          )
        `)
        .eq('member_id', id)
        .order('created_at', { ascending: false }),

      supabase
  .from('inbody_records')
  .select('*')
  .eq('member_id', id)
  .order('measured_at', { ascending: false })
  .order('created_at', { ascending: false }),
    ]);

    setData({
      memberships: m.data || [],
      reservations: r.data || [],
      workouts: w.data || [],
      inbody: i.data || [],
    });
  }

  useEffect(() => {
    load();
  }, [profile.id]);

  useEffect(() => {
    if (!profile?.id) return;

    const channel = supabase
      .channel(`member-live-${profile.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reservations',
          filter: `member_id=eq.${profile.id}`,
        },
        load
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'memberships',
          filter: `member_id=eq.${profile.id}`,
        },
        load
      )
      .on(
  'postgres_changes',
  {
    event: '*',
    schema: 'public',
    table: 'inbody_records',
    filter: `member_id=eq.${profile.id}`,
  },
  load
)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile.id]);

  const membership = data.memberships[0] || null;

const next = data.reservations.find(
  (x) =>
    x.status === 'scheduled' &&
    new Date(x.start_at) > new Date()
);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />

      <Header title="이민준 PT" />

      <ScrollView contentContainerStyle={styles.container}>
        {tab === 'home' && (
          <>
            <Text style={styles.greeting}>
              {profile.name || '회원'}님, 안녕하세요.
            </Text>

            <Card>
              <Text style={styles.cardTitle}>
                다음 PT
              </Text>

              <Text style={styles.big}>
                {next
                  ? new Date(next.start_at).toLocaleString('ko-KR')
                  : '예정된 PT가 없습니다'}
              </Text>

              <Text style={styles.sub}>
                {next?.status === 'scheduled'
                  ? '예약 예정'
                  : ''}
              </Text>
            </Card>

            <View style={styles.row}>
              <View style={styles.flexCard}>
                <Card>
                  <Stat
                    label="잔여 PT"
                    value={membership?.pt_remaining ?? 0}
                  />
                </Card>
              </View>

              <View style={styles.flexCard}>
                <Card>
                  <Stat
                    label="운동기록"
                    value={data.workouts.length}
                  />
                </Card>
              </View>
            </View>

            <Card>
              <Text style={styles.cardTitle}>
                헬스 이용기간
              </Text>

              <Text style={styles.big}>
                {membership?.gym_start_date &&
                membership?.gym_end_date
                  ? `${membership.gym_start_date} ~ ${membership.gym_end_date}`
                  : '등록 정보 없음'}
              </Text>
            </Card>

            <Button
              title="새로고침"
              secondary
              onPress={load}
            />

            <Button
              title="카카오톡으로 트레이너에게 문의"
              onPress={() =>
                Linking.openURL('https://open.kakao.com/')
              }
            />

            <Button
              title="로그아웃"
              secondary
              onPress={onLogout}
            />
          </>
        )}

        {tab === 'reserve' && (
          <>
            <Text style={styles.sectionTitle}>
              예약 내역
            </Text>

            {data.reservations.length === 0 ? (
              <Card>
                <Text>예약 내역이 없습니다.</Text>
              </Card>
            ) : (
              [...data.reservations]
                .sort((a, b) => {
                  const aScheduled =
                    a.status === 'scheduled';

                  const bScheduled =
                    b.status === 'scheduled';

                  if (aScheduled && !bScheduled) return -1;
                  if (!aScheduled && bScheduled) return 1;

                  if (aScheduled && bScheduled) {
                    return (
                      new Date(a.start_at).getTime() -
                      new Date(b.start_at).getTime()
                    );
                  }

                  return (
                    new Date(b.start_at).getTime() -
                    new Date(a.start_at).getTime()
                  );
                })
                .map((x) => (
                  <Card key={x.id}>
                    <Text style={styles.cardTitle}>
                      {new Date(
                        x.start_at
                      ).toLocaleString('ko-KR')}
                    </Text>

                    <Text
                      style={{
                        marginTop: 4,
                        fontWeight: '700',
                        color:
                          x.status === 'scheduled'
                            ? '#16835B'
                            : '#6B7280',
                      }}
                    >
                      {x.status === 'scheduled'
                        ? '예약 예정'
                        : x.status === 'completed'
                          ? 'PT 완료'
                          : '예약'}
                    </Text>

                    {x.memo && (
                      <Text style={styles.memo}>
                        {x.memo}
                      </Text>
                    )}
                  </Card>
                ))
            )}
          </>
        )}

        {tab === 'workout' && (
          <>
            <Text style={styles.sectionTitle}>
              운동기록
            </Text>

            {data.workouts.length === 0 ? (
              <Card>
                <Text>
                  등록된 운동기록이 없습니다.
                </Text>
              </Card>
            ) : (
              data.workouts.map((x) => (
                <Card key={x.id}>
                  <Text style={styles.cardTitle}>
                    {x.title}
                  </Text>

                  <Text style={styles.sub}>
                    {new Date(
                      x.created_at
                    ).toLocaleDateString('ko-KR')}
                  </Text>

                  <Text style={styles.memo}>
                    {x.memo || '메모 없음'}
                  </Text>

                  {x.workout_media
                    ?.filter(
                      (media) =>
                        media.media_type === 'video'
                    )
                    .map((media) => (
                      <WorkoutVideoLoader
                        key={media.id}
                        mediaPath={media.media_url}
                      />
                    ))}
                </Card>
              ))
            )}
          </>
        )}

       {tab === 'inbody' && (
  <>
    <Text style={styles.sectionTitle}>
      인바디
    </Text>

    {data.inbody.length === 0 ? (
      <Card>
        <Text>
          등록된 인바디 기록이 없습니다.
        </Text>
      </Card>
    ) : (
      <>
        <Card>
          <Text style={styles.cardTitle}>
            최근 측정
          </Text>

          <Text style={styles.sub}>
            {data.inbody[0].measured_at}
          </Text>

          <View style={[styles.row, { marginTop: 14 }]}>
            <View style={styles.flexCard}>
              <Stat
                label="체중"
            value={`${data.inbody[0].weight ?? '-'}kg${formatInbodyChange(weightChange)}`}
              />
            </View>

            <View style={styles.flexCard}>
              <Stat
                label="골격근량"
            value={`${data.inbody[0].skeletal_muscle_mass ?? '-'}kg${formatInbodyChange(muscleChange)}`}
              />
            </View>

            <View style={styles.flexCard}>
              <Stat
                label="체지방률"
              value={`${data.inbody[0].body_fat_percentage ?? '-'}%${formatInbodyChange(fatChange)}`}
              />
            </View>
          </View>
        </Card>

        <InbodyChart
          title="체중 변화"
          records={data.inbody}
          field="weight"
          unit="kg"
        />

        <InbodyChart
          title="골격근량 변화"
          records={data.inbody}
          field="skeletal_muscle_mass"
          unit="kg"
        />

        <InbodyChart
          title="체지방률 변화"
          records={data.inbody}
          field="body_fat_percentage"
          unit="%"
        />

        <Text style={styles.sectionTitle}>
          측정 기록
        </Text>

        {data.inbody.map((x) => (
          <Card key={x.id}>
            <Text style={styles.cardTitle}>
              {x.measured_at}
            </Text>

            <Text>체중 {x.weight ?? '-'} kg</Text>

            <Text>
              골격근량 {x.skeletal_muscle_mass ?? '-'} kg
            </Text>

            <Text>
              체지방률 {x.body_fat_percentage ?? '-'} %
            </Text>
          </Card>
        ))}
      </>
    )}
  </>
)}
      </ScrollView>

      <View style={styles.tabs}>
        {[
          ['home', '홈'],
          ['reserve', '예약'],
          ['workout', '운동기록'],
          ['inbody', '인바디'],
        ].map(([key, title]) => (
          <Pressable
            key={key}
            onPress={() => setTab(key)}
            style={styles.tab}
          >
            <Text
              style={[
                styles.tabText,
                tab === key && styles.tabActive,
              ]}
            >
              {title}
            </Text>
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}
function Admin({ profile, onLogout }) {
  const [members, setMembers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [membership, setMembership] = useState(null);
  const [busy, setBusy] = useState(false);

  const [ptSetValue, setPtSetValue] = useState('');
  const [ptAddValue, setPtAddValue] = useState('');

  const [gymStartDate, setGymStartDate] = useState('');
  const [gymStartCalendarVisible, setGymStartCalendarVisible] =
  useState(false);
  const [gymEndDate, setGymEndDate] = useState('');
const [reservationDate, setReservationDate] = useState('');
const [reservationTime, setReservationTime] = useState('');
const [reservationMemo, setReservationMemo] = useState('');
const [memberReservations, setMemberReservations] = useState([]);
const [allReservations, setAllReservations] = useState([]);
const [editingReservation, setEditingReservation] = useState(null);
const [reservationModalVisible, setReservationModalVisible] =
  useState(false);

function closeReservationModal() {
  if (busy) return;

  setReservationModalVisible(false);
  setEditingReservation(null);
  setReservationDate('');
  setReservationTime('');
  setReservationMemo('');
}

function openNewReservation() {
  setEditingReservation(null);
  setReservationDate('');
  setReservationTime('');
  setReservationMemo('');
  setReservationModalVisible(true);
}
const [workoutTitle, setWorkoutTitle] = useState('');
const [workoutMemo, setWorkoutMemo] = useState('');
const [workoutVideo, setWorkoutVideo] = useState(null);
const [memberWorkouts, setMemberWorkouts] = useState([]);
const [memberInbody, setMemberInbody] = useState([]);
const [membershipHistory, setMembershipHistory] = useState([]);
const [adminTab, setAdminTab] = useState('membership');
const [adminPage, setAdminPage] = useState('members');
const [weekOffset, setWeekOffset] = useState(0);
const [scheduleReservation, setScheduleReservation] = useState(null);
const [scheduleModalVisible, setScheduleModalVisible] = useState(false);
const [scheduleNewSlot, setScheduleNewSlot] = useState(null);
const [scheduleMemberPickerVisible, setScheduleMemberPickerVisible] =
  useState(false);
const weekDates = useMemo(() => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const day = today.getDay();

  const monday = new Date(today);
  monday.setDate(
    today.getDate() + (day === 0 ? -6 : 1 - day) + weekOffset * 7
  );

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);

    return {
      date,
      dateString: date.toLocaleDateString('en-CA'),
      month: date.getMonth() + 1,
      day: date.getDate(),
    };
  });
}, [weekOffset]);

const weekRangeLabel =
  `${weekDates[0].month}월 ${weekDates[0].day}일 ~ ` +
  `${weekDates[6].month}월 ${weekDates[6].day}일`;
 const [promptValue, setPromptValue] = useState({
  weight: '',
  muscle: '',
  fat: '',
});
const adminWeightChange = getInbodyChange(
  memberInbody,
  'weight'
);

const adminMuscleChange = getInbodyChange(
  memberInbody,
  'skeletal_muscle_mass'
);

const adminFatChange = getInbodyChange(
  memberInbody,
  'body_fat_percentage'
);
async function load() {
  const result = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'member')
    .order('created_at', { ascending: false });

  if (result.error) {
    Alert.alert('오류', result.error.message);
    return;
  }

  setMembers(result.data || []);
}
useEffect(() => {
  load();
  loadAllReservations();
}, []);
  useEffect(() => {
  const channel = supabase
    .channel(`admin-live-${profile.id}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'reservations',
      },
      () => {
        loadAllReservations();

        if (selected?.id) {
          loadReservations(selected.id);
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'memberships',
      },
      () => {
        if (selected?.id) {
          refreshMembership();
        }
      }
    )
    .on(
  'postgres_changes',
  {
    event: '*',
    schema: 'public',
    table: 'inbody_records',
  },
  () => {
    if (selected?.id) {
      loadMemberInbody(selected.id);
    }
  }
)
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [selected?.id, profile.id]);
async function loadMemberWorkouts(memberId) {
  const { data, error } = await supabase
    .from('workout_records')
    .select(`
      *,
      workout_media (
        id,
        media_type,
        media_url
      )
    `)
    .eq('member_id', memberId)
    .order('created_at', { ascending: false });

  if (error) {
    Alert.alert(
      '운동기록 불러오기 오류',
      error.message
    );
    return;
  }

  setMemberWorkouts(data || []);
}
async function loadMemberInbody(memberId) {
  const { data, error } = await supabase
    .from('inbody_records')
.select('*')
.eq('member_id', memberId)
.order('measured_at', { ascending: false })
.order('created_at', { ascending: false });

  if (error) {
    Alert.alert(
      '인바디 불러오기 오류',
      error.message
    );
    return;
  }

  setMemberInbody(data || []);
}
async function loadMembershipHistory(memberId) {
  const { data, error } = await supabase
    .from('membership_history')
    .select('*')
    .eq('member_id', memberId)
    .order('created_at', { ascending: false });

  if (error) {
    Alert.alert(
      '변경 이력 불러오기 오류',
      error.message
    );
    return;
  }

  setMembershipHistory(data || []);
}
  async function selectMember(member) {
    setEditingReservation(null);
setReservationModalVisible(false);
setReservationDate('');
setReservationTime('');
setReservationMemo('');

setWorkoutTitle('');
setWorkoutMemo('');
setWorkoutVideo(null);

setPromptValue({
  weight: '',
  muscle: '',
  fat: '',
});
    setSelected(member);
    await loadAllReservations();
    await loadMemberWorkouts(member.id);
await loadMemberInbody(member.id);
await loadMembershipHistory(member.id);
    setBusy(true);

    const { data, error } = await supabase
      .from('memberships')
      .select('*')
      .eq('member_id', member.id)
      .maybeSingle();

    setBusy(false);

    if (error) {
      Alert.alert('오류', error.message);
      return;
    }

    setMembership(data || null);

    setPtSetValue(
      data?.pt_remaining != null
        ? String(data.pt_remaining)
        : '0'
    );

    setPtAddValue('');

 setGymStartDate(data?.gym_start_date || '');
setGymEndDate(data?.gym_end_date || '');

setReservationDate('');
setReservationTime('');
setReservationMemo('');

await loadReservations(member.id);
}

  async function refreshMembership() {
    if (!selected) return;

    const { data, error } = await supabase
      .from('memberships')
      .select('*')
      .eq('member_id', selected.id)
      .maybeSingle();

    if (error) {
      Alert.alert('오류', error.message);
      return;
    }

    setMembership(data || null);

    setPtSetValue(
      data?.pt_remaining != null
        ? String(data.pt_remaining)
        : '0'
    );

    setGymStartDate(data?.gym_start_date || '');
    setGymEndDate(data?.gym_end_date || '');
    await loadMembershipHistory(selected.id);
  }

async function setPtDirectly() {
  if (!selected || busy) return;

  const amount = Number(ptSetValue);

  if (
    ptSetValue.trim() === '' ||
    !Number.isInteger(amount) ||
    amount < 0
  ) {
    Alert.alert(
      '알림',
      '잔여 PT 횟수를 0 이상의 숫자로 입력해주세요.'
    );
    return;
  }

  setBusy(true);

  try {
   

    const { error } = await supabase.rpc(
      'admin_update_membership',
      {
        p_member_id: selected.id,
        p_pt_remaining: amount,
      }
    );

    if (error) {
      throw error;
    }

    

    await refreshMembership();

    Alert.alert(
      '완료',
      `잔여 PT를 ${amount}회로 설정했습니다.`
    );
  } catch (error) {
    Alert.alert(
      '오류',
      error?.message || 'PT 설정 중 오류가 발생했습니다.'
    );
  } finally {
    setBusy(false);
  }
}
async function addPtCustom() {
  if (!selected || busy) return;

  const amount = Number(ptAddValue);

  if (
    ptAddValue.trim() === '' ||
    !Number.isInteger(amount) ||
    amount <= 0
  ) {
    Alert.alert(
      '알림',
      '추가할 PT 횟수를 1 이상의 숫자로 입력해주세요.'
    );
    return;
  }

  setBusy(true);

  try {
   

    // 기존 PT 추가
    const { error } = await supabase.rpc(
      'admin_add_pt',
      {
        p_member_id: selected.id,
        p_amount: amount,
      }
    );

    if (error) {
      throw error;
    }

   

    setPtAddValue('');

    await refreshMembership();

    Alert.alert(
      '완료',
      `PT ${amount}회를 추가했습니다.`
    );
  } catch (error) {
    Alert.alert(
      '오류',
      error?.message || 'PT 추가 중 오류가 발생했습니다.'
    );
  } finally {
    setBusy(false);
  }
}
function setGymPeriodByMonths(months) {
  if (!gymStartDate) {
    Alert.alert(
      '알림',
      '먼저 헬스 시작일을 입력해주세요.'
    );
    return;
  }

  const datePattern = /^\d{4}-\d{2}-\d{2}$/;

  if (!datePattern.test(gymStartDate)) {
    Alert.alert(
      '알림',
      '시작일을 2026-11-11 형식으로 입력해주세요.'
    );
    return;
  }

  const [year, month, day] =
    gymStartDate.split('-').map(Number);

  const targetMonthIndex =
    month - 1 + months;

  const targetYear =
    year + Math.floor(targetMonthIndex / 12);

  const targetMonth =
    targetMonthIndex % 12;

  const lastDayOfTargetMonth =
    new Date(
      targetYear,
      targetMonth + 1,
      0
    ).getDate();

  const safeDay =
    Math.min(day, lastDayOfTargetMonth);

  const endYear = targetYear;

  const endMonth = String(
    targetMonth + 1
  ).padStart(2, '0');

  const endDay = String(
    safeDay
  ).padStart(2, '0');

  setGymEndDate(
    `${endYear}-${endMonth}-${endDay}`
  );
}
function addGymServiceDays(days) {
  if (!gymEndDate) {
    Alert.alert(
      '알림',
      '먼저 종료일을 설정해주세요.'
    );
    return;
  }

  const datePattern = /^\d{4}-\d{2}-\d{2}$/;

  if (!datePattern.test(gymEndDate)) {
    Alert.alert(
      '알림',
      '종료일을 2026-10-06 형식으로 입력해주세요.'
    );
    return;
  }

  const [year, month, day] =
    gymEndDate.split('-').map(Number);

  const date = new Date(
    Date.UTC(year, month - 1, day)
  );

  date.setUTCDate(
    date.getUTCDate() + days
  );

  const newYear = date.getUTCFullYear();

  const newMonth = String(
    date.getUTCMonth() + 1
  ).padStart(2, '0');

  const newDay = String(
    date.getUTCDate()
  ).padStart(2, '0');

  setGymEndDate(
    `${newYear}-${newMonth}-${newDay}`
  );
}
 async function saveGymDates() {
  if (!selected || busy) return;

  if (!gymStartDate || !gymEndDate) {
    Alert.alert(
      '알림',
      '헬스 시작일과 종료일을 모두 입력해주세요.'
    );
    return;
  }

  const datePattern = /^\d{4}-\d{2}-\d{2}$/;

  if (
    !datePattern.test(gymStartDate) ||
    !datePattern.test(gymEndDate)
  ) {
    Alert.alert(
      '알림',
      '날짜는 2026-10-06 형식으로 입력해주세요.'
    );
    return;
  }

  if (
    new Date(gymEndDate) <
    new Date(gymStartDate)
  ) {
    Alert.alert(
      '알림',
      '종료일은 시작일보다 빠를 수 없습니다.'
    );
    return;
  }

  setBusy(true);

  try {
   

    const { error } = await supabase.rpc(
      'admin_update_membership',
      {
        p_member_id: selected.id,
        p_gym_start_date: gymStartDate,
        p_gym_end_date: gymEndDate,
      }
    );

    if (error) {
      throw error;
    }

    

    await refreshMembership();

    Alert.alert(
      '완료',
      '헬스 이용기간을 저장했습니다.'
    );
  } catch (error) {
    Alert.alert(
      '오류',
      error?.message || '이용기간 저장 중 오류가 발생했습니다.'
    );
  } finally {
    setBusy(false);
  }
}

async function loadReservations(memberId) {
  const { data, error } = await supabase
    .from('reservations')
    .select('*')
    .eq('member_id', memberId)
    .order('start_at', { ascending: true });

  if (error) {
    Alert.alert('예약 조회 오류', error.message);
    return;
  }

  setMemberReservations(data || []);
}
async function loadAllReservations() {
  const { data, error } = await supabase
    .from('reservations')
    .select('*')
    .order('start_at', { ascending: true });

  if (error) {
    Alert.alert('전체 예약 조회 오류', error.message);
    return;
  }

  setAllReservations(data || []);
}
function makeReservationDateTime(dateString, timeString) {
  if (!dateString || !timeString) {
    return new Date(NaN);
  }

  if (timeString === '24:00') {
    const [year, month, day] = dateString.split('-').map(Number);

    return new Date(
      year,
      month - 1,
      day + 1,
      0,
      0,
      0,
      0
    );
  }

  return new Date(`${dateString}T${timeString}:00`);
}

 
function formatReservationTimeLabel(time) {
  const hour = Number(time.split(':')[0]);

  if (hour === 24) return '자정 12시';
  if (hour < 12) return `오전 ${hour}시`;
  if (hour === 12) return '오후 12시';

  return `오후 ${hour - 12}시`;
}
async function addReservation() {
  if (!selected || busy) return;

  if (!reservationDate || !reservationTime) {
    Alert.alert(
      '알림',
      '예약 날짜와 시간을 선택해주세요.'
    );
    return;
  }

 const startDate = makeReservationDateTime(
  reservationDate,
  reservationTime
);

  if (Number.isNaN(startDate.getTime())) {
    Alert.alert(
      '알림',
      '날짜 또는 시간이 올바르지 않습니다.'
    );
    return;
  }
  if (startDate.getTime() <= Date.now()) {
  Alert.alert(
    '알림',
    '지난 시간에는 예약할 수 없습니다.'
  );
  return;
}


  const endDate = new Date(
    startDate.getTime() + 60 * 60 * 1000
  );

  setBusy(true);

  try {
    const { error } = await supabase.rpc(
      'admin_create_pt_reservation',
      {
        p_member_id: selected.id,
        p_start_at: startDate.toISOString(),
        p_end_at: endDate.toISOString(),
        p_memo: reservationMemo.trim() || null,
      }
    );

    if (error) throw error;

    setReservationDate('');
    setReservationTime('');
    setReservationMemo('');

    await refreshMembership();
    await loadReservations(selected.id);
    await loadAllReservations();

    setReservationModalVisible(false);

    Alert.alert(
      '예약 완료',
      `${selected.name || '회원'}님의 PT 예약을 등록했습니다.\n잔여 PT 1회가 차감되었습니다.`
    );
  } catch (error) {
    Alert.alert(
      '예약 등록 오류',
      error?.message || '예약 등록에 실패했습니다.'
    );
  } finally {
    setBusy(false);
  }
}
function startEditReservation(reservation) {
  const reservationStart = new Date(reservation.start_at);

 const year = reservationStart.getFullYear();
const month = String(
  reservationStart.getMonth() + 1
).padStart(2, '0');
const day = String(
  reservationStart.getDate()
).padStart(2, '0');

const hour = String(
  reservationStart.getHours()
).padStart(2, '0');
const minute = String(
  reservationStart.getMinutes()
).padStart(2, '0');

setEditingReservation(reservation);

if (hour === '00' && minute === '00') {
  const previousDay = new Date(reservationStart);
  previousDay.setDate(previousDay.getDate() - 1);

  const previousYear = previousDay.getFullYear();
  const previousMonth = String(
    previousDay.getMonth() + 1
  ).padStart(2, '0');
  const previousDate = String(
    previousDay.getDate()
  ).padStart(2, '0');

  setReservationDate(
    `${previousYear}-${previousMonth}-${previousDate}`
  );
  setReservationTime('24:00');
} else {
  setReservationDate(`${year}-${month}-${day}`);
  setReservationTime(`${hour}:${minute}`);
}
  setReservationMemo(reservation.memo || '');
  setReservationModalVisible(true);
}
async function openScheduleReservationEdit() {
  if (!scheduleReservation || busy) return;

  const reservation = scheduleReservation;

  const member = members.find(
    (item) => item.id === reservation.member_id
  );

  if (!member) {
    Alert.alert('알림', '회원을 찾을 수 없습니다.');
    return;
  }

  setScheduleModalVisible(false);

  await selectMember(member);

  setAdminPage('members');
  setAdminTab('reservation');

  startEditReservation(reservation);

  setScheduleReservation(null);
}
async function updateReservation() {
  if (
    !editingReservation ||
    !reservationDate ||
    !reservationTime ||
    busy
  ) {
    return;
  }

  const startDate = makeReservationDateTime(
    reservationDate,
    reservationTime
  );

  if (Number.isNaN(startDate.getTime())) {
    Alert.alert(
      '알림',
      '날짜 또는 시간이 올바르지 않습니다.'
    );
    return;
  }

  if (startDate.getTime() <= Date.now()) {
    Alert.alert(
      '알림',
      '지난 시간으로 예약을 변경할 수 없습니다.'
    );
    return;
  }

  const endDate = new Date(
    startDate.getTime() + 60 * 60 * 1000
  );

  const overlappingReservation = allReservations.find(
    (reservation) => {
      if (reservation.id === editingReservation.id) {
        return false;
      }

      if (
        reservation.status !== 'scheduled' ||
        reservation.trainer_id !== profile.id
      ) {
        return false;
      }

      const existingStart =
        new Date(reservation.start_at).getTime();

      const existingEnd =
        new Date(reservation.end_at).getTime();

      return (
        startDate.getTime() < existingEnd &&
        endDate.getTime() > existingStart
      );
    }
  );

  if (overlappingReservation) {
    Alert.alert(
      '알림',
      '이미 다른 PT 예약이 있는 시간입니다.'
    );
    return;
  }

  setBusy(true);

  try {
    const { error } = await supabase.rpc(
      'admin_update_pt_reservation',
      {
        p_reservation_id: editingReservation.id,
        p_start_at: startDate.toISOString(),
        p_end_at: endDate.toISOString(),
        p_memo: reservationMemo.trim() || null,
      }
    );

    if (error) throw error;

    setEditingReservation(null);
    setReservationDate('');
    setReservationTime('');
    setReservationMemo('');

    await loadReservations(selected.id);
    await loadAllReservations();

    setReservationModalVisible(false);

    Alert.alert(
      '완료',
      'PT 예약을 변경했습니다.'
    );
  } catch (error) {
    Alert.alert(
      '예약 변경 오류',
      error?.message || '예약 변경에 실패했습니다.'
    );
  } finally {
    setBusy(false);
  }
}
function deleteReservation(reservation) {
  if (!reservation?.id || busy) return;

  if (reservation.status === 'completed') {
    Alert.alert(
      '알림',
      '이미 완료된 PT는 취소할 수 없습니다.'
    );
    return;
  }

  const reservationTime = new Date(
    reservation.start_at
  ).toLocaleString('ko-KR');

  Alert.alert(
    '예약을 취소할까요?',
    `${reservationTime}\n\n취소하면 PT 1회가 다시 복구됩니다.`,
    [
      {
        text: '돌아가기',
        style: 'cancel',
      },
      {
        text: '예약 취소',
        style: 'destructive',
        onPress: async () => {
          if (busy) return;

          setBusy(true);

          try {
            const { error } = await supabase.rpc(
              'admin_cancel_pt_reservation',
              {
                p_reservation_id: reservation.id,
              }
            );

            if (error) throw error;

            await refreshMembership();
            await loadReservations(selected.id);
            await loadAllReservations();

            Alert.alert(
              '예약 취소 완료',
              '예약이 취소되었고 PT 1회가 복구되었습니다.'
            );
          } catch (error) {
            Alert.alert(
              '예약 취소 오류',
              error?.message || '예약 취소에 실패했습니다.'
            );
          } finally {
            setBusy(false);
          }
        },
      },
    ]
  );
}

async function pickWorkoutVideo() {
  const permission =
    await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (!permission.granted) {
    Alert.alert(
      '권한 필요',
      '운동 영상을 선택하려면 사진 및 동영상 접근 권한이 필요합니다.'
    );
    return;
  }

  const result =
    await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      allowsEditing: false,
      quality: 1,
    });

  if (!result.canceled && result.assets?.length > 0) {
    setWorkoutVideo(result.assets[0]);
  }
}
async function deleteWorkoutRecord(workout) {
  if (!workout?.id || busy) return;

  Alert.alert(
    '운동기록 삭제',
    '이 운동기록과 등록된 영상도 함께 삭제할까요?',
    [
      {
        text: '취소',
        style: 'cancel',
      },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);

          try {
            // Storage에 있는 실제 영상 파일 삭제
            const mediaPaths = (workout.workout_media || [])
              .map((media) => media.media_url)
              .filter(Boolean);

            if (mediaPaths.length > 0) {
              const { error: storageError } =
                await supabase.storage
                  .from('workout-media')
                  .remove(mediaPaths);

              if (storageError) {
                throw storageError;
              }
            }

            // workout_media DB 기록 삭제
            const { error: mediaError } = await supabase
              .from('workout_media')
              .delete()
              .eq('workout_record_id', workout.id);

            if (mediaError) {
              throw mediaError;
            }

            // 운동기록 삭제
            const { error: workoutError } = await supabase
              .from('workout_records')
              .delete()
              .eq('id', workout.id);

            if (workoutError) {
              throw workoutError;
            }

            await loadMemberWorkouts(selected.id);

            Alert.alert(
              '완료',
              '운동기록과 영상을 삭제했습니다.'
            );
          } catch (error) {
            Alert.alert(
              '삭제 오류',
              error?.message || '삭제 중 오류가 발생했습니다.'
            );
          } finally {
            setBusy(false);
          }
        },
      },
    ]
  );
}
async function saveWorkoutRecord() {
  if (!selected || busy) return;

  if (!workoutTitle.trim()) {
    Alert.alert('알림', '운동 제목을 입력해주세요.');
    return;
  }

  setBusy(true);

  try {
    // 1. 운동기록 저장
    const { data: record, error: recordError } =
      await supabase
        .from('workout_records')
        .insert({
          member_id: selected.id,
          trainer_id: profile.id,
          title: workoutTitle.trim(),
          memo: workoutMemo.trim() || null,
        })
        .select()
        .single();

    if (recordError) {
      throw recordError;
    }

    // 2. 영상이 선택되어 있으면 Storage에 업로드
    if (workoutVideo) {
      const base64 = await FileSystem.readAsStringAsync(
  workoutVideo.uri,
  {
    encoding: FileSystem.EncodingType.Base64,
  }
);

const binaryString = atob(base64);
const bytes = new Uint8Array(binaryString.length);

for (let i = 0; i < binaryString.length; i++) {
  bytes[i] = binaryString.charCodeAt(i);
}

      const extension =
        workoutVideo.fileName?.split('.').pop() || 'mp4';

      const filePath =
        `${selected.id}/${record.id}/${Date.now()}.${extension}`;

      const { error: uploadError } =
        await supabase.storage
          .from('workout-media')
          .upload(filePath, bytes, {
            contentType:
              workoutVideo.mimeType || 'video/mp4',
            upsert: false,
          });

      if (uploadError) {
        throw uploadError;
      }

      // 3. workout_media에 영상 정보 연결
      const { error: mediaError } =
        await supabase
          .from('workout_media')
          .insert({
            workout_record_id: record.id,
            media_type: 'video',
            media_url: filePath,
          });

      if (mediaError) {
        throw mediaError;
      }
    }

    // 4. 입력창 초기화
    setWorkoutTitle('');
    setWorkoutMemo('');
    setWorkoutVideo(null);
    await loadMemberWorkouts(selected.id);

    Alert.alert(
      '완료',
      workoutVideo
        ? '운동기록과 영상을 저장했습니다.'
        : '운동기록을 저장했습니다.'
    );
  } catch (error) {
    Alert.alert(
      '운동기록 저장 오류',
      error?.message || '저장 중 오류가 발생했습니다.'
    );
  } finally {
    setBusy(false);
  }
}
  async function saveInbody() {
    if (!selected || busy) return;

    if (
      !promptValue.weight ||
      !promptValue.muscle ||
      !promptValue.fat
    ) {
      Alert.alert(
        '알림',
        '인바디 정보를 모두 입력해주세요.'
      );
      return;
    }

    setBusy(true);

    const { error } = await supabase.rpc(
      'add_inbody',
      {
        p_member_id: selected.id,
        p_weight: Number(promptValue.weight),
        p_skeletal_muscle_mass: Number(
          promptValue.muscle
        ),
        p_body_fat_percentage: Number(
          promptValue.fat
        ),
      }
    );

    setBusy(false);

    if (error) {
      Alert.alert('오류', error.message);
      return;
    }
await loadMemberInbody(selected.id);
    Alert.alert(
      '완료',
      '인바디가 등록되었습니다.'
    );

    setPromptValue({
      weight: '',
      muscle: '',
      fat: '',
    });
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />

      <Header title="관리자" />

      <ScrollView
        contentContainerStyle={styles.container}
      >
        <View
  style={{
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  }}
>
  <Pressable
    onPress={() => setAdminPage('members')}
    style={{
      flex: 1,
      paddingVertical: 13,
      borderRadius: 12,
      alignItems: 'center',
      backgroundColor:
        adminPage === 'members'
          ? '#111827'
          : '#FFFFFF',
      borderWidth: 1,
      borderColor:
        adminPage === 'members'
          ? '#111827'
          : '#E5E7EB',
    }}
  >
    <Text
      style={{
        fontWeight: '700',
        color:
          adminPage === 'members'
            ? '#FFFFFF'
            : '#111827',
      }}
    >
      회원관리
    </Text>
  </Pressable>

  <Pressable
    onPress={() => setAdminPage('schedule')}
    style={{
      flex: 1,
      paddingVertical: 13,
      borderRadius: 12,
      alignItems: 'center',
      backgroundColor:
        adminPage === 'schedule'
          ? '#111827'
          : '#FFFFFF',
      borderWidth: 1,
      borderColor:
        adminPage === 'schedule'
          ? '#111827'
          : '#E5E7EB',
    }}
  >
    <Text
      style={{
        fontWeight: '700',
        color:
          adminPage === 'schedule'
            ? '#FFFFFF'
            : '#111827',
      }}
    >
      주간스케줄
    </Text>
  </Pressable>
</View>
{adminPage === 'members' && (
  <>
        <Text style={styles.sectionTitle}>
          회원 관리
        </Text>

        {members.map((member) => (
          <Pressable
            key={member.id}
            onPress={() => selectMember(member)}
          >
            <Card>
              <View style={styles.rowBetween}>
                <View>
                  <Text style={styles.cardTitle}>
                    {member.name ||
                      member.email ||
                      '회원'}
                  </Text>

                  <Text style={styles.sub}>
                    {member.phone ||
                      member.email ||
                      ''}
                  </Text>
                </View>

                <Text style={styles.badge}>
                  {member.role}
                </Text>
              </View>
            </Card>
          </Pressable>
        ))}

        {selected && (
          <Card>
            <Text style={styles.cardTitle}>
              선택 회원:{' '}
              {selected.name ||
                selected.email}
            </Text>

            <Text style={styles.sub}>
              상태: {selected.status}
            </Text>
<View
  style={{
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 15,
    marginBottom: 20,
  }}
>
  {[
    ['membership', 'PT·이용권'],
    ['reservation', '예약'],
    ['workout', '운동기록'],
    ['inbody', '인바디'],
  ].map(([key, title]) => (
    <Pressable
      key={key}
      onPress={() => setAdminTab(key)}
      style={{
        paddingVertical: 10,
        paddingHorizontal: 13,
        borderRadius: 10,
        borderWidth: 1,
        borderColor:
          adminTab === key ? '#111827' : '#E5E7EB',
        backgroundColor:
          adminTab === key ? '#111827' : '#FFFFFF',
      }}
    >
      <Text
        style={{
          fontWeight: '700',
          color:
            adminTab === key ? '#FFFFFF' : '#111827',
        }}
      >
        {title}
      </Text>
    </Pressable>
  ))}
</View>
{adminTab === 'membership' && (
  <>
            <Text style={styles.label}>
              현재 잔여 PT
            </Text>

            <Text style={styles.big}>
              {membership?.pt_remaining ?? 0}회
            </Text>

            <Text style={styles.label}>
              잔여 PT 직접 설정
            </Text>

            <TextInput
              style={styles.input}
              placeholder="예: 20"
              keyboardType="number-pad"
              value={ptSetValue}
              onChangeText={setPtSetValue}
            />

            <Button
              title={
                busy
                  ? '처리 중...'
                  : '잔여 PT 설정'
              }
              onPress={setPtDirectly}
              disabled={busy}
            />

            <Text style={styles.label}>
              PT 추가 등록
            </Text>

            <TextInput
              style={styles.input}
              placeholder="추가할 횟수 예: 10"
              keyboardType="number-pad"
              value={ptAddValue}
              onChangeText={setPtAddValue}
            />

            <Button
              title={
                busy
                  ? '처리 중...'
                  : '입력한 횟수만큼 + 추가'
              }
              onPress={addPtCustom}
              disabled={busy}
            />

<Text style={styles.label}>
  헬스 이용권 시작일
</Text>

<Pressable
  onPress={() =>
    setGymStartCalendarVisible((current) => !current)
  }
  style={styles.input}
>
  <Text
    style={{
      color: gymStartDate ? '#111827' : '#9CA3AF',
      fontSize: 16,
    }}
  >
    {gymStartDate || '날짜 선택'}
  </Text>
</Pressable>

{gymStartCalendarVisible && (
  <Calendar
    current={gymStartDate || undefined}
    markedDates={
      gymStartDate
        ? {
            [gymStartDate]: {
              selected: true,
              selectedColor: '#111827',
            },
          }
        : {}
    }
    onDayPress={(day) => {
      setGymStartDate(day.dateString);
      setGymStartCalendarVisible(false);
    }}
  />
)}
<Text style={styles.label}>
  헬스 이용권 종료일
</Text>

<TextInput
  style={styles.input}
  placeholder="2027-01-06"
  value={gymEndDate}
  onChangeText={setGymEndDate}
/>

<Text style={styles.label}>
  빠른 기간 설정
</Text>

<View
  style={{
    flexDirection: 'row',
    gap: 14,
    marginBottom: 18,
  }}
>
  <View style={{ flex: 1 }}>
    <Button
      title="1개월"
      secondary
      onPress={() => setGymPeriodByMonths(1)}
      disabled={busy}
    />
  </View>

  <View style={{ flex: 1 }}>
    <Button
      title="3개월"
      secondary
      onPress={() => setGymPeriodByMonths(3)}
      disabled={busy}
    />
  </View>

  <View style={{ flex: 1 }}>
    <Button
      title="6개월"
      secondary
      onPress={() => setGymPeriodByMonths(6)}
      disabled={busy}
    />
  </View>

  <View style={{ flex: 1 }}>
    <Button
      title="12개월"
      secondary
      onPress={() => setGymPeriodByMonths(12)}
      disabled={busy}
    />
  </View>
</View>

<Text style={styles.label}>
  서비스 기간 추가
</Text>

<View
  style={{
    flexDirection: 'row',
    gap: 18,
    marginBottom: 20,
  }}
>
  <View style={{ flex: 1 }}>
    <Button
      title="+1일"
      secondary
      onPress={() => addGymServiceDays(1)}
      disabled={busy}
    />
  </View>

  <View style={{ flex: 1 }}>
    <Button
      title="+7일"
      secondary
      onPress={() => addGymServiceDays(7)}
      disabled={busy}
    />
  </View>
</View>

<Button
  title={busy ? '처리 중...' : '헬스 이용기간 저장'}
  onPress={saveGymDates}
  disabled={busy}
/>

            <Text style={styles.sub}>
              현재 이용기간:{' '}
              {membership?.gym_start_date ||
                '미등록'}{' '}
              ~{' '}
              {membership?.gym_end_date ||
                '미등록'}
            </Text>
<Text style={styles.sectionTitle}>
  PT / 이용권 변경 이력
</Text>

{membershipHistory.length === 0 ? (
  <Text style={styles.sub}>
    변경 이력이 없습니다.
  </Text>
) : (
  <ScrollView
    style={{
      maxHeight: 250,
      marginBottom: 12,
    }}
    nestedScrollEnabled={true}
    showsVerticalScrollIndicator={true}
  >
    {membershipHistory.map((history) => (
      <View
        key={history.id}
        style={{
          paddingVertical: 10,
          borderBottomWidth: 1,
          borderBottomColor: '#eee',
        }}
      >
        <Text style={styles.cardTitle}>
          {history.action}
        </Text>

  <Text style={styles.sub}>
  {history.memo || '변경 내용 없음'}
  {history.action === 'PT 추가' &&
    history.new_pt != null &&
    ` · 잔여 ${
      history.previous_pt != null
        ? `${history.previous_pt}회 → `
        : ''
    }${history.new_pt}회`}
</Text>

        <Text style={styles.sub}>
          {new Date(history.created_at).toLocaleString('ko-KR')}
        </Text>
      </View>
    ))}
  </ScrollView>
)}
  </>
)}

{adminTab === 'workout' && (
  <>
          <Text style={styles.sectionTitle}>
  운동기록 등록
</Text>

<Text style={styles.label}>
  운동 제목
</Text>

<TextInput
  style={styles.input}
  placeholder="예: 하체 PT / 스쿼트"
  value={workoutTitle}
  onChangeText={setWorkoutTitle}
/>

<Text style={styles.label}>
  운동 메모
</Text>

<TextInput
  style={styles.input}
  placeholder="예: 스쿼트 60kg 10회 3세트"
  value={workoutMemo}
  onChangeText={setWorkoutMemo}
  multiline
/>

<Button
  title={
    workoutVideo
      ? '영상 선택 완료'
      : '운동 영상 선택'
  }
  secondary
  onPress={pickWorkoutVideo}
/>

{workoutVideo && (
  <Text style={styles.sub}>
    선택된 영상: {workoutVideo.fileName || '운동 영상'}
  </Text>
)}
<Button
  title={
    busy
      ? '저장 중...'
      : '운동기록 저장'
  }
  onPress={saveWorkoutRecord}
  disabled={busy}
/>
<Text style={styles.label}>
  등록된 운동기록
</Text>

{memberWorkouts.length === 0 ? (
  <Text style={styles.sub}>
    등록된 운동기록이 없습니다.
  </Text>
) : (
  memberWorkouts.map((workout) => (
    <View
      key={workout.id}
      style={{
        marginTop: 10,
        marginBottom: 10,
      }}
    >
      <Text style={styles.cardTitle}>
        {workout.title}
      </Text>

      <Text style={styles.sub}>
        {new Date(
          workout.created_at
        ).toLocaleDateString('ko-KR')}
      </Text>

      <Text style={styles.memo}>
        {workout.memo || '메모 없음'}
      </Text>

      <Text style={styles.sub}>
        영상 {workout.workout_media?.length || 0}개
      </Text>

      <Button
        title="운동기록 삭제"
        secondary
        onPress={() =>
          deleteWorkoutRecord(workout)
        }
        disabled={busy}
      />
    </View>
  ))
)}
  </>
)}

{adminTab === 'inbody' && (
  <>
    <Text style={styles.label}>
      인바디 입력
    </Text>

    <TextInput
      style={styles.input}
      placeholder="체중 kg"
      keyboardType="numeric"
      value={promptValue.weight}
      onChangeText={(value) =>
        setPromptValue({
          ...promptValue,
          weight: value,
        })
      }
    />

    <TextInput
      style={styles.input}
      placeholder="골격근량 kg"
      keyboardType="numeric"
      value={promptValue.muscle}
      onChangeText={(value) =>
        setPromptValue({
          ...promptValue,
          muscle: value,
        })
      }
    />

    <TextInput
      style={styles.input}
      placeholder="체지방률 %"
      keyboardType="numeric"
      value={promptValue.fat}
      onChangeText={(value) =>
        setPromptValue({
          ...promptValue,
          fat: value,
        })
      }
    />

    <Button
      title={busy ? '처리 중...' : '인바디 저장'}
      onPress={saveInbody}
      disabled={busy}
    />

    {memberInbody.length > 0 && (
      <>
        <Card>
          <Text style={styles.cardTitle}>
            최근 측정
          </Text>

          <Text style={styles.sub}>
            {memberInbody[0].measured_at}
          </Text>

          <View style={[styles.row, { marginTop: 14 }]}>
            <View style={styles.flexCard}>
              <Stat
                label="체중"
                value={`${memberInbody[0].weight ?? '-'}kg${formatInbodyChange(adminWeightChange)}`}
              />
            </View>

            <View style={styles.flexCard}>
              <Stat
                label="골격근량"
                value={`${memberInbody[0].skeletal_muscle_mass ?? '-'}kg${formatInbodyChange(adminMuscleChange)}`}
              />
            </View>

            <View style={styles.flexCard}>
              <Stat
                label="체지방률"
                value={`${memberInbody[0].body_fat_percentage ?? '-'}%${formatInbodyChange(adminFatChange)}`}
              />
            </View>
          </View>
        </Card>

        <InbodyChart
          title="체중 변화"
          records={memberInbody}
          field="weight"
          unit="kg"
        />

        <InbodyChart
          title="골격근량 변화"
          records={memberInbody}
          field="skeletal_muscle_mass"
          unit="kg"
        />

        <InbodyChart
          title="체지방률 변화"
          records={memberInbody}
          field="body_fat_percentage"
          unit="%"
        />
      </>
    )}

    <Text style={[styles.sectionTitle, { marginTop: 24 }]}>
      인바디 기록
    </Text>

    {memberInbody.length === 0 ? (
      <Card>
        <Text>
          등록된 인바디 기록이 없습니다.
        </Text>
      </Card>
    ) : (
      memberInbody.map((x) => (
        <Card key={x.id}>
          <Text style={styles.cardTitle}>
            {x.measured_at}
          </Text>

          <Text>체중 {x.weight ?? '-'} kg</Text>
          <Text>
            골격근량 {x.skeletal_muscle_mass ?? '-'} kg
          </Text>
          <Text>
            체지방률 {x.body_fat_percentage ?? '-'} %
          </Text>
        </Card>
      ))
    )}
  </>
)}
{adminTab === 'reservation' && (
  <>
            <Text style={styles.sectionTitle}>
  PT 스케줄 관리
</Text>

<Button
  title="새 예약 등록"
  onPress={openNewReservation}
  disabled={
    busy || (membership?.pt_remaining ?? 0) <= 0
  }
/>

{(membership?.pt_remaining ?? 0) <= 0 && (
  <Text style={styles.sub}>
    잔여 PT가 없어 새 예약을 등록할 수 없습니다.
  </Text>
)}

<Modal
  visible={reservationModalVisible}
  animationType="slide"
  onRequestClose={closeReservationModal}
>
  <SafeAreaView style={styles.safe}>
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.sectionTitle}>
        {editingReservation ? '예약 수정' : '새 예약 등록'}
      </Text>

      <Text style={styles.sub}>
        {selected.name || '회원'}님의 PT
      </Text>
      <Text
  style={{
    marginTop: 6,
    marginBottom: 12,
    fontWeight: '700',
  }}
>
  잔여 PT {membership?.pt_remaining ?? 0}회
</Text>
<Text style={styles.label}>
  예약 날짜
</Text>

<Calendar
current={
  reservationDate ||
  new Date().toLocaleDateString('en-CA')
}  
minDate={new Date().toLocaleDateString('en-CA')}
onDayPress={(day) => {
  setReservationDate(day.dateString);
  setReservationTime('');
}}
  markedDates={
    reservationDate
      ? {
          [reservationDate]: {
            selected: true,
          },
        }
      : {}
  }
  monthFormat={'yyyy년 M월'}
  enableSwipeMonths={true}
/>

<Text
  style={{
    marginTop: 12,
    marginBottom: 10,
    fontWeight: '700',
  }}
>
  선택한 날짜: {reservationDate || '날짜를 선택해주세요'}
</Text>


  <Text style={styles.label}>
  예약 시간
</Text>
{!reservationDate && (
  <Text style={styles.sub}>
    먼저 예약 날짜를 선택해주세요.
  </Text>
)}
<View
  style={{
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 15,
  }}
>
{[
  '06:00',
  '07:00',
  '08:00',
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
  '18:00',
  '19:00',
  '20:00',
  '21:00',
  '22:00',
  '23:00',
  '24:00',
].map((time) => {
 const selectedDateTime = makeReservationDateTime(
  reservationDate,
  time
);
const isPastTime =
  selectedDateTime.getTime() <= Date.now();
 const reservedReservation = allReservations.find((reservation) => {
  if (reservation.id === editingReservation?.id) {
    return false;
  }

  if (
    reservation.status !== 'scheduled' ||
    reservation.trainer_id !== profile.id
  ) {
    return false;
  }

  const start = new Date(reservation.start_at).getTime();
  const end = new Date(reservation.end_at).getTime();

  const selectedStart = selectedDateTime.getTime();
  const selectedEnd = selectedStart + 60 * 60 * 1000;

  return start < selectedEnd && end > selectedStart;
});

const isReserved = !!reservedReservation;
const isTimeDisabled =
  !reservationDate || isReserved || isPastTime;
const reservedMember = reservedReservation
  ? members.find(
      (member) => member.id === reservedReservation.member_id
    )
  : null;

  return (
   <Pressable
  key={time}
disabled={isTimeDisabled}
  onPress={() => {
    if (!isTimeDisabled) {
  setReservationTime(time);
}
  }}
  style={{
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor:
  isReserved
    ? '#FCA5A5'
    : !reservationDate || isPastTime
      ? '#D1D5DB'
      : reservationTime === time
        ? '#111827'
        : '#E5E7EB',

backgroundColor:
  isReserved
    ? '#FEE2E2'
    : !reservationDate || isPastTime
      ? '#E5E7EB'
      : reservationTime === time
        ? '#111827'
        : '#FFFFFF',

opacity:
  !reservationDate || isPastTime ? 0.6 : 1,
  }}
>
  <Text
    style={{
      fontWeight: '700',
      color:
  isReserved
    ? '#B91C1C'
    : !reservationDate || isPastTime
      ? '#9CA3AF'
      : reservationTime === time
        ? '#FFFFFF'
        : '#111827',
    }}
  >
{isReserved
  ? `${formatReservationTimeLabel(time)} ${reservedMember?.name || '예약됨'}`
  : formatReservationTimeLabel(time)}
  </Text>
</Pressable>
  );
})}

</View>
<Text style={styles.sub}>
  선택한 시간: {reservationTime || '시간을 선택해주세요'}
</Text>
{reservationDate && reservationTime && (
  <View
    style={{
      marginTop: 12,
      marginBottom: 16,
      padding: 14,
      borderRadius: 12,
      backgroundColor: '#F3F4F6',
    }}
  >
    <Text
      style={{
        fontSize: 16,
        fontWeight: '700',
      }}
    >
      {reservationDate} · {formatReservationTimeLabel(reservationTime)}
    </Text>

    <Text
      style={{
        marginTop: 5,
        color: '#6B7280',
      }}
    >
      {selected?.name || '회원'}님 PT
    </Text>
  </View>
)}
<Text style={styles.label}>
  메모
</Text>

<TextInput
  style={styles.input}
  placeholder="예: 하체 PT / 체형교정"
  value={reservationMemo}
  onChangeText={setReservationMemo}
/>

<Button
  title={
    busy
      ? '처리 중...'
      : editingReservation
        ? '예약 변경'
        : '예약 등록'
  }
  onPress={
    editingReservation
      ? updateReservation
      : addReservation
  }
  disabled={
    busy || !reservationDate || !reservationTime
  }
/>

<Button
  title="취소"
  secondary
  onPress={closeReservationModal}
  disabled={busy}
/>

    </ScrollView>
  </SafeAreaView>
</Modal>

<Text style={styles.label}>
  등록된 PT 예약
</Text>

{memberReservations.length === 0 ? (
  <Text style={styles.sub}>
    등록된 예약이 없습니다.
  </Text>
) : (
  <>
    <Text style={styles.label}>
      예정된 PT
    </Text>

    {memberReservations.filter(
      (reservation) =>
        new Date(reservation.start_at) >= new Date() &&
        reservation.status !== 'completed'
    ).length === 0 ? (
      <Text style={styles.sub}>
        예정된 PT가 없습니다.
      </Text>
    ) : (
      memberReservations
        .filter(
          (reservation) =>
            new Date(reservation.start_at) >= new Date() &&
            reservation.status !== 'completed'
        )
        .map((reservation) => (
          <View
            key={reservation.id}
            style={{
              marginTop: 10,
              marginBottom: 10,
            }}
          >
            <Text style={styles.cardTitle}>
              {new Date(
                reservation.start_at
              ).toLocaleString('ko-KR')}
            </Text>

            <Text style={styles.sub}>
              {reservation.memo || 'PT 예약'}
            </Text>


            <Button
              title="예약 변경"
              onPress={() =>
                startEditReservation(reservation)
              }
              disabled={busy}
            />

            <Button
              title="예약 취소"
              secondary
              onPress={() =>
                deleteReservation(reservation)
              }
              disabled={busy}
            />
          </View>
        ))
    )}

    <Text style={styles.label}>
      지난 PT
    </Text>
<ScrollView
  style={{
    maxHeight: 320,
    marginBottom: 12,
  }}
  nestedScrollEnabled={true}
  showsVerticalScrollIndicator={true}
>
    {memberReservations.filter(
      (reservation) =>
        new Date(reservation.start_at) < new Date() ||
        reservation.status === 'completed'
    ).length === 0 ? (
      <Text style={styles.sub}>
        지난 PT 기록이 없습니다.
      </Text>
    ) : (
     memberReservations
  .filter(
    (reservation) =>
      new Date(reservation.start_at) < new Date() ||
      reservation.status === 'completed'
  )
  .sort(
    (a, b) =>
      new Date(b.start_at).getTime() -
      new Date(a.start_at).getTime()
  )
  .map((reservation) => (
          <View
            key={reservation.id}
            style={{
              marginTop: 10,
              marginBottom: 10,
            }}
          >
            <Text style={styles.cardTitle}>
              {new Date(
                reservation.start_at
              ).toLocaleString('ko-KR')}
            </Text>

            <Text style={styles.sub}>
              {reservation.memo || 'PT 예약'}
            </Text>

            <Text style={styles.sub}>
              {reservation.status === 'completed'
                ? 'PT 완료'
                : '지난 예약'}
            </Text>

          </View>
        ))
    )}
    </ScrollView>
  </>
)}
  </>
)}
          </Card>
        )}

        <Button
          title="새로고침"
          secondary
          onPress={load}
        />
<Button
  title="로그아웃"
  secondary
  onPress={onLogout}
/>
  </>
)}

{adminPage === 'schedule' && (
  <>
    <Text style={styles.sectionTitle}>
      주간 스케줄
    </Text>

    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14,
      }}
    >
      <Pressable
        onPress={() =>
          setWeekOffset((current) => current - 1)
        }
      >
        <Text style={{ fontWeight: '700' }}>
          ‹ 이전 주
        </Text>
      </Pressable>

      <Pressable onPress={() => setWeekOffset(0)}>
        <Text style={{ fontWeight: '700' }}>
          이번 주
        </Text>
      </Pressable>

      <Pressable
        onPress={() =>
          setWeekOffset((current) => current + 1)
        }
      >
        <Text style={{ fontWeight: '700' }}>
          다음 주 ›
        </Text>
      </Pressable>
    </View>

    <Text
      style={{
        textAlign: 'center',
        fontSize: 17,
        fontWeight: '800',
        marginBottom: 20,
      }}
    >
      {weekRangeLabel}
    </Text>
    <View
  style={{
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    overflow: 'hidden',
  }}
>
  {/* 요일 */}
  <View
    style={{
      flexDirection: 'row',
      backgroundColor: '#F9FAFB',
    }}
  >
    <View
      style={{
        width: 36,
        borderRightWidth: 1,
        borderRightColor: '#E5E7EB',
      }}
    />

    {weekDates.map((day, index) => {
      const today =
        day.dateString ===
        new Date().toLocaleDateString('en-CA');

      const dayNames = [
        '월',
        '화',
        '수',
        '목',
        '금',
        '토',
        '일',
      ];

      return (
        <View
          key={day.dateString}
          style={{
            flex: 1,
            paddingVertical: 8,
            alignItems: 'center',
            backgroundColor: today
              ? '#E8F5EF'
              : '#F9FAFB',
            borderRightWidth:
              index === 6 ? 0 : 1,
            borderRightColor: '#E5E7EB',
          }}
        >
          <Text
            style={{
              fontSize: 11,
              fontWeight: '800',
            }}
          >
            {dayNames[index]}
          </Text>

          <Text
            style={{
              fontSize: 9,
              marginTop: 2,
              color: today
                ? '#16835B'
                : '#6B7280',
              fontWeight: today
                ? '800'
                : '500',
            }}
          >
            {day.month}/{day.day}
          </Text>
        </View>
      );
    })}
  </View>

  {/* 시간표 */}
  {Array.from(
    { length: 19 },
    (_, index) => index + 6
  ).map((hour) => (
    <View
      key={hour}
      style={{
        flexDirection: 'row',
        minHeight: 46,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
      }}
    >
      <View
        style={{
          width: 36,
          alignItems: 'center',
          paddingTop: 5,
          borderRightWidth: 1,
          borderRightColor: '#E5E7EB',
        }}
      >
        <Text
          style={{
            fontSize: 9,
            color: '#6B7280',
          }}
        >
          {String(hour).padStart(2, '0')}
        </Text>
      </View>

      {weekDates.map((day, dayIndex) => {
        const time =
          `${String(hour).padStart(2, '0')}:00`;

        const cellDate =
          makeReservationDateTime(
            day.dateString,
            time
          );

        const reservation =
          allReservations.find((item) => {
            if (
              item.status !== 'scheduled' ||
              item.trainer_id !== profile.id
            ) {
              return false;
            }

            return (
              new Date(item.start_at).getTime() ===
              cellDate.getTime()
            );
          });

        const member = reservation
          ? members.find(
              (item) =>
                item.id === reservation.member_id
            )
          : null;

        const today =
          day.dateString ===
          new Date().toLocaleDateString('en-CA');

  
          const isPastSlot =
  cellDate.getTime() <= Date.now();

return reservation ? (
  <View
    key={`${day.dateString}-${hour}`}
    style={{
      flex: 1,
      padding: 2,
      borderRightWidth:
        dayIndex === 6 ? 0 : 1,
      borderRightColor: '#E5E7EB',
      backgroundColor: today
        ? '#FAFFFC'
        : '#FFFFFF',
    }}
  >
    <Pressable
      onPress={() => {
        setScheduleReservation(reservation);
        setScheduleModalVisible(true);
      }}
      style={{
        flex: 1,
        minHeight: 40,
        borderRadius: 6,
        backgroundColor: '#E8F5EF',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 2,
      }}
    >
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
        style={{
          fontSize: 10,
          fontWeight: '800',
          color: '#14532D',
        }}
      >
        {member?.name || '회원'}
      </Text>
    </Pressable>
  </View>
) : (
  <Pressable
    key={`${day.dateString}-${hour}`}
    disabled={isPastSlot}
    onPress={() => {
      setScheduleNewSlot({
        date: day.dateString,
        time,
      });

      setScheduleMemberPickerVisible(true);
    }}
    style={{
      flex: 1,
      minHeight: 46,
      borderRightWidth:
        dayIndex === 6 ? 0 : 1,
      borderRightColor: '#E5E7EB',
      backgroundColor: isPastSlot
        ? '#F3F4F6'
        : today
          ? '#FAFFFC'
          : '#FFFFFF',
    }}
  />
);
      })}
    </View>
  ))}
</View>
<Modal
  visible={scheduleModalVisible}
  transparent
  animationType="fade"
  onRequestClose={() => {
    setScheduleModalVisible(false);
    setScheduleReservation(null);
  }}
>
  <View
    style={{
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.35)',
      justifyContent: 'center',
      padding: 24,
    }}
  >
    <View
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        padding: 20,
      }}
    >
      <Text
        style={{
          fontSize: 20,
          fontWeight: '800',
          marginBottom: 18,
        }}
      >
        PT 예약
      </Text>

      {scheduleReservation && (() => {
        const member = members.find(
          (item) =>
            item.id === scheduleReservation.member_id
        );

        return (
          <>
            <Text
              style={{
                fontSize: 18,
                fontWeight: '800',
                marginBottom: 8,
              }}
            >
              {member?.name || '회원'}
            </Text>

            <Text
              style={{
                fontSize: 16,
                marginBottom: 6,
              }}
            >
              {new Date(
                scheduleReservation.start_at
              ).toLocaleString('ko-KR')}
            </Text>

            <Text
              style={{
                color: '#6B7280',
                marginBottom: 20,
              }}
            >
              {scheduleReservation.memo || '메모 없음'}
            </Text>
          </>
        );
      })()}
<Button
  title="예약 변경"
  onPress={openScheduleReservationEdit}
/>

<Button
  title="예약 취소"
  secondary
  onPress={() => {
    if (!scheduleReservation) return;

    const reservation = scheduleReservation;

    const reservationTime = new Date(
      reservation.start_at
    ).toLocaleString('ko-KR');

    Alert.alert(
      '예약을 취소할까요?',
      `${reservationTime}\n\n취소하면 PT 1회가 다시 복구됩니다.`,
      [
        {
          text: '돌아가기',
          style: 'cancel',
        },
        {
          text: '예약 취소',
          style: 'destructive',
          onPress: async () => {
            if (busy) return;

            setBusy(true);

            try {
              const { error } = await supabase.rpc(
                'admin_cancel_pt_reservation',
                {
                  p_reservation_id: reservation.id,
                }
              );

              if (error) throw error;

              await loadAllReservations();

              if (
                selected?.id === reservation.member_id
              ) {
                await refreshMembership();
                await loadReservations(
                  reservation.member_id
                );
              }

              setScheduleModalVisible(false);
              setScheduleReservation(null);

              Alert.alert(
                '예약 취소 완료',
                '예약이 취소되었고 PT 1회가 복구되었습니다.'
              );
            } catch (error) {
              Alert.alert(
                '예약 취소 오류',
                error?.message ||
                  '예약 취소에 실패했습니다.'
              );
            } finally {
              setBusy(false);
            }
          },
        },
      ]
    );
  }}
/>
      <Button
        title="닫기"
        secondary
        onPress={() => {
          setScheduleModalVisible(false);
          setScheduleReservation(null);
        }}
      />
    </View>
  </View>
</Modal>
<Modal
  visible={scheduleMemberPickerVisible}
  transparent
  animationType="fade"
  onRequestClose={() => {
    setScheduleMemberPickerVisible(false);
    setScheduleNewSlot(null);
  }}
>
  <View
    style={{
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.35)',
      justifyContent: 'center',
      padding: 24,
    }}
  >
    <View
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        padding: 20,
        maxHeight: '70%',
      }}
    >
      <Text
        style={{
          fontSize: 20,
          fontWeight: '800',
          marginBottom: 6,
        }}
      >
        회원 선택
      </Text>

      <Text
        style={{
          color: '#6B7280',
          marginBottom: 16,
        }}
      >
        {scheduleNewSlot
          ? `${scheduleNewSlot.date} · ${formatReservationTimeLabel(scheduleNewSlot.time)}`
          : ''}
      </Text>

      <ScrollView>
        {members.map((member) => (
          <Pressable
            key={member.id}
            onPress={async () => {
              const slot = scheduleNewSlot;

              setScheduleMemberPickerVisible(false);

              await selectMember(member);

              setReservationDate(slot.date);
              setReservationTime(slot.time);
              setReservationMemo('');
              setEditingReservation(null);

              setAdminPage('members');
              setAdminTab('reservation');
              setReservationModalVisible(true);

              setScheduleNewSlot(null);
            }}
            style={{
              paddingVertical: 14,
              borderBottomWidth: 1,
              borderBottomColor: '#E5E7EB',
            }}
          >
            <Text
              style={{
                fontSize: 16,
                fontWeight: '700',
              }}
            >
              {member.name || '회원'}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <Button
        title="닫기"
        secondary
        onPress={() => {
          setScheduleMemberPickerVisible(false);
          setScheduleNewSlot(null);
        }}
      />
    </View>
  </View>
</Modal>
  </>
)}
    
      </ScrollView>
    </SafeAreaView>
  );
}
export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  async function loadProfile(currentSession) {
    if (!currentSession?.user?.id) {
      setProfile(null);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', currentSession.user.id)
      .single();

    if (error) {
      console.log('프로필 오류:', error.message);
      setProfile(null);
    } else {
      setProfile(data);
    }

    setLoading(false);
  }

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;

      setSession(data.session);
      loadProfile(data.session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        if (!mounted) return;

        setSession(newSession);

        if (newSession) {
          setLoading(true);
          loadProfile(newSession);
        } else {
          setProfile(null);
          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text>이민준 PT 준비 중...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!session || !profile) {
    return (
      <Login
        onLogin={(newSession) => {
          setSession(newSession);
          setLoading(true);
          loadProfile(newSession);
        }}
      />
    );
  }

  return profile.role === 'admin' ? (
    <Admin
      profile={profile}
      onLogout={handleLogout}
    />
  ) : (
    <MemberHome
      profile={profile}
      onLogout={handleLogout}
    />
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },

  container: {
    padding: 20,
    paddingBottom: 40,
  },

  loginWrap: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: colors.bg,
  },

  brand: {
    fontSize: 34,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 6,
  },

  tagline: {
    color: colors.sub,
    marginBottom: 24,
  },

  card: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },

  flexCard: {
    flex: 1,
  },

  header: {
    height: 64,
    backgroundColor: colors.card,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },

  back: {
    fontSize: 34,
    color: colors.text,
  },

  greeting: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 18,
    color: colors.text,
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 8,
  },

  big: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
  },

  sub: {
    fontSize: 13,
    color: colors.sub,
    marginTop: 4,
  },

  memo: {
    fontSize: 14,
    color: colors.text,
    marginTop: 8,
    lineHeight: 20,
  },

  row: {
    flexDirection: 'row',
    gap: 12,
  },

  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  stat: {
    minWidth: 110,
  },

  statValue: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
  },

  statLabel: {
    color: colors.sub,
    marginTop: 3,
  },

  sectionTitle: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 16,
    color: colors.text,
  },

  button: {
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 12,
  },

  buttonSecondary: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.line,
  },

  buttonText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
  },

  buttonTextSecondary: {
    color: colors.text,
  },

  label: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.sub,
    marginTop: 8,
    marginBottom: 6,
  },

  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: 10,
    color: colors.text,
  },

  switch: {
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '700',
    color: colors.text,
  },

  notice: {
    textAlign: 'center',
    color: colors.sub,
    fontSize: 12,
    marginTop: 10,
  },

  tabs: {
    height: 70,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: colors.line,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },

  tab: {
    paddingHorizontal: 10,
    paddingVertical: 12,
  },

  tabText: {
    color: colors.sub,
    fontWeight: '700',
  },

  tabActive: {
    color: colors.text,
  },

  badge: {
    fontSize: 12,
    color: colors.green,
    fontWeight: '800',
  },

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
});