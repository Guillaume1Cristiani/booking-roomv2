pm2 stop booking-room;
pm2 start npm --name "booking-room" -- start; 
