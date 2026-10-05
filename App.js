import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert, FlatList, Linking, Pressable, SafeAreaView, ScrollView,
  StyleSheet, Text, TextInput, View
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false }
});

const colors = { bg:'#F5F7FA', card:'#FFFFFF', text:'#111827', sub:'#6B7280', line:'#E5E7EB', accent:'#111827', green:'#16835B', red:'#C24141' };

function Button({title, onPress, secondary=false}) { return <Pressable onPress={onPress} style={[styles.button, secondary && styles.buttonSecondary]}><Text style={[styles.buttonText, secondary && styles.buttonTextSecondary]}>{title}</Text></Pressable>; }
function Card({children}) { return <View style={styles.card}>{children}</View>; }
function Header({title, onBack}) { return <View style={styles.header}>{onBack ? <Pressable onPress={onBack}><Text style={styles.back}>‹</Text></Pressable> : <View style={{width:25}}/>}<Text style={styles.headerTitle}>{title}</Text><View style={{width:25}}/></View>; }
function Stat({label,value}) { return <View style={styles.stat}><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>; }

function Login({onLogin}) {
  const [email,setEmail]=useState(''); const [password,setPassword]=useState(''); const [busy,setBusy]=useState(false); const [signup,setSignup]=useState(false); const [name,setName]=useState(''); const [phone,setPhone]=useState('');
  async function submit(){
    if(!email||!password) return Alert.alert('입력 확인','이메일과 비밀번호를 입력해주세요.');
    setBusy(true);
    try {
      let result;
      if(signup) result=await supabase.auth.signUp({email,password,options:{data:{name,phone}}});
      else result=await supabase.auth.signInWithPassword({email,password});
      if(result.error) throw result.error;
      if(signup) Alert.alert('가입 신청 완료','관리자 승인 후 로그인할 수 있습니다.');
      else onLogin(result.data.session);
    } catch(e){ Alert.alert('오류',e.message||'로그인에 실패했습니다.'); }
    finally{setBusy(false)}
  }
  return <SafeAreaView style={styles.safe}><StatusBar style="dark"/><ScrollView contentContainerStyle={styles.loginWrap}>
    <Text style={styles.brand}>이민준 PT</Text><Text style={styles.tagline}>회원관리 · PT기록 · 예약관리</Text>
    <Card>
      {signup && <><Text style={styles.label}>이름</Text><TextInput style={styles.input} value={name} onChangeText={setName} placeholder="이름"/><Text style={styles.label}>휴대폰</Text><TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="010-0000-0000" keyboardType="phone-pad"/></>}
      <Text style={styles.label}>이메일</Text><TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="example@email.com" autoCapitalize="none" keyboardType="email-address"/>
      <Text style={styles.label}>비밀번호</Text><TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder="비밀번호" secureTextEntry/>
      <Button title={busy?'처리 중...':signup?'회원가입 신청':'로그인'} onPress={submit}/>
      <Pressable onPress={()=>setSignup(!signup)}><Text style={styles.switch}>{signup?'로그인으로 돌아가기':'회원가입 신청'}</Text></Pressable>
    </Card>
    <Text style={styles.notice}>※ 회원가입 후 관리자 승인 방식입니다.</Text>
  </ScrollView></SafeAreaView>
}

function MemberHome({profile,onLogout}) {
  const [tab,setTab]=useState('home'); const [data,setData]=useState({memberships:[],reservations:[],workouts:[],inbody:[]}); const [loading,setLoading]=useState(true);
  async function load(){
    setLoading(true);
    const id=profile.id;
    const [m,r,w,i]=await Promise.all([
      supabase.from('memberships').select('*').eq('member_id',id).order('end_date',{ascending:true}),
      supabase.from('reservations').select('*').eq('member_id',id).order('start_at',{ascending:true}),
      supabase.from('workout_records').select('*').eq('member_id',id).order('created_at',{ascending:false}),
      supabase.from('inbody_records').select('*').eq('member_id',id).order('measured_at',{ascending:false})
    ]);
    setData({memberships:m.data||[],reservations:r.data||[],workouts:w.data||[],inbody:i.data||[]}); setLoading(false);
  }
  useEffect(()=>{load()},[profile.id]);
  const pt=useMemo(()=>data.memberships.find(x=>x.type==='pt'||x.membership_type==='pt'),[data.memberships]);
  const next=data.reservations.find(x=>new Date(x.start_at)>new Date());
  return <SafeAreaView style={styles.safe}><StatusBar style="dark"/><Header title="이민준 PT"/>
    <ScrollView contentContainerStyle={styles.container}>
      {tab==='home' && <>
        <Text style={styles.greeting}>{profile.name||'회원'}님, 안녕하세요.</Text>
        <Card><Text style={styles.cardTitle}>다음 PT</Text><Text style={styles.big}>{next?new Date(next.start_at).toLocaleString('ko-KR'):'예정된 PT가 없습니다'}</Text><Text style={styles.sub}>{next?.status||''}</Text></Card>
        <View style={styles.row}><Card><Stat label="잔여 PT" value={pt?.remaining_pt??0}/></Card><Card><Stat label="운동기록" value={data.workouts.length}/></Card></View>
        <Card><Text style={styles.cardTitle}>헬스 이용기간</Text><Text style={styles.big}>{pt?.end_date?`${pt.end_date}까지`:'등록 정보 없음'}</Text></Card>
        <Button title="카카오톡으로 트레이너에게 문의" onPress={()=>Linking.openURL('https://open.kakao.com/')}/>
      </>}
      {tab==='reserve' && <><Text style={styles.sectionTitle}>예약 내역</Text>{data.reservations.length===0?<Card><Text>예약 내역이 없습니다.</Text></Card>:data.reservations.map(x=><Card key={x.id}><Text style={styles.cardTitle}>{new Date(x.start_at).toLocaleString('ko-KR')}</Text><Text style={styles.sub}>{x.status||'예약'}</Text></Card>)}</>}
      {tab==='workout' && <><Text style={styles.sectionTitle}>운동기록</Text>{data.workouts.length===0?<Card><Text>등록된 운동기록이 없습니다.</Text></Card>:data.workouts.map(x=><Card key={x.id}><Text style={styles.cardTitle}>{x.title}</Text><Text style={styles.sub}>{new Date(x.created_at).toLocaleDateString('ko-KR')}</Text><Text style={styles.memo}>{x.memo||'메모 없음'}</Text></Card>)}</>}
      {tab==='inbody' && <><Text style={styles.sectionTitle}>인바디</Text>{data.inbody.length===0?<Card><Text>등록된 인바디 기록이 없습니다.</Text></Card>:data.inbody.map(x=><Card key={x.id}><Text style={styles.cardTitle}>{x.measured_at}</Text><Text>체중 {x.weight??'-'} kg</Text><Text>골격근량 {x.skeletal_muscle_mass??'-'} kg</Text><Text>체지방률 {x.body_fat_percentage??'-'} %</Text></Card>)}</>}
      <Button title="로그아웃" secondary onPress={onLogout}/>
    </ScrollView>
    <View style={styles.tabs}>{[['home','홈'],['reserve','예약'],['workout','운동기록'],['inbody','인바디']].map(([k,t])=><Pressable key={k} onPress={()=>setTab(k)} style={styles.tab}><Text style={[styles.tabText,tab===k&&styles.tabActive]}>{t}</Text></Pressable>)}</View>
  </SafeAreaView>
}

function Admin({profile,onLogout}) {
  const [tab,setTab]=useState('members'); const [members,setMembers]=useState([]); const [selected,setSelected]=useState(null); const [busy,setBusy]=useState(false);
  async function load(){const r=await supabase.from('profiles').select('*').order('created_at',{ascending:false}); setMembers(r.data||[])}
  useEffect(()=>{load()},[]);
  async function addPt(){if(!selected)return; setBusy(true); const {error}=await supabase.rpc('add_pt',{p_member_id:selected.id,p_amount:1}); setBusy(false); if(error)Alert.alert('오류',error.message); else Alert.alert('완료','PT 1회 추가');}
  async function saveInbody(){if(!selected)return; const weight=Number(promptValue.weight); const muscle=Number(promptValue.muscle); const fat=Number(promptValue.fat); const {error}=await supabase.rpc('add_inbody',{p_member_id:selected.id,p_weight:weight,p_skeletal_muscle_mass:muscle,p_body_fat_percentage:fat}); if(error)Alert.alert('오류',error.message); else Alert.alert('완료','인바디가 등록되었습니다.');}
  const [promptValue,setPromptValue]=useState({weight:'',muscle:'',fat:''});
  return <SafeAreaView style={styles.safe}><StatusBar style="dark"/><Header title="관리자"/><ScrollView contentContainerStyle={styles.container}>
    <Text style={styles.sectionTitle}>회원 관리</Text>
    {tab==='members' && <>{members.map(m=><Pressable key={m.id} onPress={()=>setSelected(m)}><Card><View style={styles.rowBetween}><View><Text style={styles.cardTitle}>{m.name||m.email||'회원'}</Text><Text style={styles.sub}>{m.phone||m.email||''}</Text></View><Text style={styles.badge}>{m.role}</Text></View></Card></Pressable>)}
      {selected&&<Card><Text style={styles.cardTitle}>선택 회원: {selected.name||selected.email}</Text><Text style={styles.sub}>상태: {selected.status}</Text><Button title={busy?'처리 중...':'PT 1회 추가'} onPress={addPt}/><Text style={styles.label}>인바디 입력</Text><TextInput style={styles.input} placeholder="체중 kg" keyboardType="numeric" value={promptValue.weight} onChangeText={v=>setPromptValue({...promptValue,weight:v})}/><TextInput style={styles.input} placeholder="골격근량 kg" keyboardType="numeric" value={promptValue.muscle} onChangeText={v=>setPromptValue({...promptValue,muscle:v})}/><TextInput style={styles.input} placeholder="체지방률 %" keyboardType="numeric" value={promptValue.fat} onChangeText={v=>setPromptValue({...promptValue,fat:v})}/><Button title="인바디 저장" onPress={saveInbody}/></Card>}
    </>}
    {tab==='settings'&&<Card><Text style={styles.cardTitle}>예약 정책</Text><Text>현재 기본 모드: 트레이너가 예약을 잡는 방식</Text><Text>변경 제한: 12시간 / 주 1회 정책</Text></Card>}
    <Button title="설정 보기" secondary onPress={()=>setTab('settings')}/><Button title="새로고침" secondary onPress={load}/><Button title="로그아웃" secondary onPress={onLogout}/>
  </ScrollView></SafeAreaView>
}

export default function App(){
  const [session,setSession]=useState(null); const [profile,setProfile]=useState(null); const [loading,setLoading]=useState(true);
  async function loadProfile(s){ if(!s){setProfile(null);setLoading(false);return;} const {data,error}=await supabase.from('profiles').select('*').eq('id',s.user.id).single(); if(error) Alert.alert('프로필 오류',error.message); setProfile(data); setLoading(false); }
  useEffect(()=>{supabase.auth.getSession().then(({data})=>{setSession(data.session);loadProfile(data.session)}); const {data:{subscription}}=supabase.auth.onAuthStateChange((_e,s)=>{setSession(s);loadProfile(s)}); return ()=>subscription.unsubscribe()},[]);
  if(loading)return <SafeAreaView style={styles.safe}><View style={styles.center}><Text>이민준 PT 준비 중...</Text></View></SafeAreaView>;
  if(!session||!profile)return <Login onLogin={s=>{setSession(s);loadProfile(s)}}/>;
  if(profile.status!=='active')return <SafeAreaView style={styles.safe}><View style={styles.center}><Text style={styles.big}>승인 대기 중</Text><Text style={styles.sub}>관리자 승인 후 이용할 수 있습니다.</Text><Button title="로그아웃" secondary onPress={()=>supabase.auth.signOut()}/></View></SafeAreaView>;
  return profile.role==='admin'?<Admin profile={profile} onLogout={()=>supabase.auth.signOut()}/>:<MemberHome profile={profile} onLogout={()=>supabase.auth.signOut()}/>;
}

const styles=StyleSheet.create({safe:{flex:1,backgroundColor:colors.bg},container:{padding:20,paddingBottom:40},loginWrap:{flexGrow:1,justifyContent:'center',padding:24,backgroundColor:colors.bg},brand:{fontSize:34,fontWeight:'800',color:colors.text,marginBottom:6},tagline:{color:colors.sub,marginBottom:24},card:{backgroundColor:colors.card,borderRadius:18,padding:18,marginBottom:14,shadowColor:'#000',shadowOpacity:.04,shadowRadius:8,elevation:1},header:{height:64,backgroundColor:colors.card,flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:18,borderBottomWidth:1,borderBottomColor:colors.line},headerTitle:{fontSize:18,fontWeight:'800',color:colors.text},back:{fontSize:34,color:colors.text},greeting:{fontSize:24,fontWeight:'800',marginBottom:18,color:colors.text},cardTitle:{fontSize:16,fontWeight:'800',color:colors.text,marginBottom:8},big:{fontSize:22,fontWeight:'800',color:colors.text},sub:{fontSize:13,color:colors.sub,marginTop:4},memo:{fontSize:14,color:colors.text,marginTop:8,lineHeight:20},row:{flexDirection:'row',gap:12},rowBetween:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},stat:{minWidth:110},statValue:{fontSize:28,fontWeight:'800',color:colors.text},statLabel:{color:colors.sub,marginTop:3},sectionTitle:{fontSize:24,fontWeight:'800',marginBottom:16,color:colors.text},button:{backgroundColor:colors.accent,borderRadius:14,paddingVertical:15,alignItems:'center',marginBottom:12},buttonSecondary:{backgroundColor:'#fff',borderWidth:1,borderColor:colors.line},buttonText:{color:'#fff',fontWeight:'800',fontSize:15},buttonTextSecondary:{color:colors.text},label:{fontSize:13,fontWeight:'700',color:colors.sub,marginTop:8,marginBottom:6},input:{backgroundColor:'#fff',borderWidth:1,borderColor:colors.line,borderRadius:12,paddingHorizontal:14,paddingVertical:13,marginBottom:10,color:colors.text},switch:{textAlign:'center',marginTop:8,fontWeight:'700',color:colors.text},notice:{textAlign:'center',color:colors.sub,fontSize:12,marginTop:10},tabs:{height:70,backgroundColor:'#fff',borderTopWidth:1,borderTopColor:colors.line,flexDirection:'row',justifyContent:'space-around',alignItems:'center'},tab:{paddingHorizontal:10,paddingVertical:12},tabText:{color:colors.sub,fontWeight:'700'},tabActive:{color:colors.text},badge:{fontSize:12,color:colors.green,fontWeight:'800'},center:{flex:1,justifyContent:'center',alignItems:'center',padding:30}}
);
