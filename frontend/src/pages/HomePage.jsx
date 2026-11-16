import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../lib/api';
import LabCard from '../components/LabCard';
import { useAuth } from '../context/AuthContext';

export default function HomePage() {
  const { user, activeInstance } = useAuth();
  const [labs, setLabs] = useState([]);

  useEffect(() => {
    async function load() {
      try {
        const res = await apiRequest('/labs');
        setLabs(res.data || []);
      } catch (err) {
        // ignore
      }
    }
    load();
  }, []);

  return (
    <div className="space-y-4">
      {/* Welcome Banner */}
      <div className="fb-box p-4 bg-white border border-[#d8dfea]">
        <h1 className="text-lg font-bold text-[#3b5998] border-b border-[#eceff5] pb-2 mb-2">
          ยินดีต้อนรับสู่ PETBUG — เครือข่ายฝึกฝนความปลอดภัยทางไซเบอร์
        </h1>
        <p className="text-gray-700 text-xs leading-relaxed mb-3">
          PETBUG เปิดโอกาสให้นักวิจัยความปลอดภัย นักศึกษา และผู้ที่สนใจด้านการเจาะระบบ (Penetration Testing) ได้ฝึกฝนกับ Web Application ที่มีช่องโหว่จริงในสภาพแวดล้อมจำลองที่แยก Container เฉพาะแต่ละบุคคล พร้อมกำหนด Subdomain อัตโนมัติผ่าน Traefik
        </p>

        <div className="bg-[#fff9d7] border border-[#e2c822] p-2.5 rounded-[2px] text-xs flex items-center justify-between">
          <div>
            <b>พร้อมที่จะเริ่มต้นแล้วหรือยัง?</b> เลือกลองทำโจทย์ความท้าทายด้านล่าง หรือตรวจสอบตารางคะแนนอันดับแฮกเกอร์
          </div>
          <Link to="/labs" className="fb-btn text-[11px] whitespace-nowrap">
            ดูโจทย์ทั้งหมด &rarr;
          </Link>
        </div>
      </div>

      {/* Featured Challenges Feed */}
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b border-[#d8dfea] pb-1">
          <h2 className="font-bold text-[#3b5998] text-sm">ฟีดโจทย์ด่านทดสอบล่าสุด</h2>
          <span className="text-[11px] text-gray-500">มีทั้งหมด {labs.length} ด่าน</span>
        </div>

        {labs.slice(0, 5).map((lab) => (
          <LabCard
            key={lab.id}
            lab={lab}
            isActiveInstance={activeInstance?.labId === lab.id}
          />
        ))}
      </div>
    </div>
  );
}
