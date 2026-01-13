import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function useSwipeBack() {
  const navigate = useNavigate();
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  // ระยะทางขั้นต่ำที่จะถือว่า "ปัด" (pixels)
  const minSwipeDistance = 100; 

  const onTouchStart = (e) => {
    setTouchEnd(null); // Reset
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    // ถ้าปัดขวา (Right Swipe) -> ย้อนกลับ
    if (isRightSwipe) {
      console.log('Swiped Back!');
      navigate(-1); 
    }
  };

  useEffect(() => {
    // เพิ่ม Event Listener ให้ทั้งหน้าจอ
    document.addEventListener('touchstart', onTouchStart);
    document.addEventListener('touchmove', onTouchMove);
    document.addEventListener('touchend', onTouchEnd);

    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
    };
  }, [touchStart, touchEnd]);
}