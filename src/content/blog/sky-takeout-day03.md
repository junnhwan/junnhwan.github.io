---
title: "sky-takeout-day03-note"
description: "Sky-takeout 苍穹外卖项目实战 Day03：公共字段自动填充与菜品管理相关功能开发。"
pubDate: 2025-10-12
tags: ["Java", "项目学习"]
category: "Java"
draft: false
---

# Sky-takeout Day03

---

> 【前言】  
> Day03 的 Task 是 **公共字段自动填充** 与 **菜品管理相关功能** 的代码开发，主要的菜品管理部分也是基础 CRUD 的练习，另外就是公共字段自动填充这种偏向技术一点的开发技巧的学习。
>
> 公共字段自动填充主要涉及到 枚举、注解、Spring的 AOP 、反射 的知识，用**自定义注解**实现了当执行 ***insert新增\* 与 \*update更新*** 时在Mapper层对创建人、创建时间和修改人、修改时间的字段的自动填充，避免了在Service设置属性的冗余重复代码。
>
> 剩余的菜品管理就是 CRUD 练习了， 只是相比前面的员工管理模块，菜品管理会涉及到菜品Dish与分类Category、套餐Setmeal的**多表的联系**，分析起来会更比员工管理的单表更复杂一点，要考虑的比较多，但是这部分练习能锻炼到我们对**多表的业务功能的分析能力**。

## Contents

* 公共字段自动填充
* 新增菜品
* 菜品分页查询
* 删除菜品
* 修改菜品

## 1. 公共字段自动填充

### 公共字段问题引入

​前面在**新增员工**或者**新增菜品分类**时需要设置创建时间、创建人、修改时间、修改人等字段，在**编辑员工**或者**编辑菜品分类**时需要设置修改时间、修改人等字段。这些字段属于**公共字段**，很多表中都会有这些字段，如下：

| **序号** | **字段名** | **含义** | **数据类型** |
| --- | --- | --- | --- |
| 1 | create\_time | 创建时间 | datetime |
| 2 | create\_user | 创建人id | bigint |
| 3 | update\_time | 修改时间 | datetime |
| 4 | update\_user | 修改人id | bigint |

对于这些字段，我们的赋值方式为：

1). 在新增数据时, 将createTime、updateTime 设置为当前时间, createUser、updateUser设置为当前登录用户ID。

2). 在更新数据时, 将updateTime 设置为当前时间, updateUser设置为当前登录用户ID。

代码层面，复制方式如下，通过set属性来设置这些公共字段的值

Insert时  
![image-20251012092311740](/images/posts/image-20251012092311740.png)

Update时  
![image-20251012092427001](/images/posts/image-20251012092427001.png)

如果都按照上述的操作方式来处理这些公共字段, 需要在每一个业务方法中进行操作, 编码相对冗余、繁琐，那能不能对于这些公共字段在某个地方统一处理，来简化开发呢？

* 答案是可以的，我们使用**AOP切面编程，实现功能增强**，来完成公共字段自动填充功能。

这样做的好处：

* 减少重复代码，提升开发效率；
* 保证字段赋值的一致性（如时间格式、操作人 ID 的来源统一）；
* 降低人为疏忽导致的字段遗漏风险。

### 实现思路

**实现步骤：**

1). 自定义注解 AutoFill，用于标识需要进行公共字段自动填充的方法

2). 自定义切面类 AutoFillAspect，统一拦截加入了 AutoFill 注解的方法，通过反射为公共字段赋值

3). 在 Mapper 的方法上加入 AutoFill 注解

实现上述步骤，需掌握以下知识

**技术点**：枚举、注解、AOP、反射

### 代码编写

#### 1）编写注解，自定义注解AutoFill

在sky-server模块，创建com.sky.annotation包。

```java
package com.sky.annotation;

import com.sky.enumeration.OperationType;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * 自定义公共字段自动填充注解，用于标记需要自动填充公共字段的方法
 */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface AutoFill {

    // 数据库操作类型，如插入或更新 INSERT, UPDATE
    OperationType value();
}
```

在初始项目的枚举包中已定义了操作类型枚举  
![image-20251012095830097](/images/posts/image-20251012095830097.png)

#### 2）编写切面类, 自定义AutoFillAspect切面

在sky-server模块，创建com.sky.aspect包。

```java
package com.sky.aspect;

import com.sky.annotation.AutoFill;
import com.sky.constant.AutoFillConstant;
import com.sky.context.BaseContext;
import com.sky.enumeration.OperationType;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Before;
import org.aspectj.lang.annotation.Pointcut;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.stereotype.Component;

import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.time.LocalDateTime;

/**
 * 自定义切面类，处理公共字段自动填充逻辑
 */
@Aspect
@Component
@Slf4j
public class AutoFillAspect {

    /**
     * 切入点，匹配所有标记了 @AutoFill 注解的方法
     */
    // 切入点表达式，匹配所有在 com.sky.mapper 包下的方法，并且这些方法上有 @AutoFill 注解
    // execution(* com.sky.mapper.*.*(..)) 匹配 com.sky.mapper 包及其子包下的所有方法
    // && @annotation(com.sky.annotation.AutoFill) 匹配那些被 @AutoFill 注解标记的方法
    // 这样，任何调用 com.sky.mapper 包下的方法且这些方法被 @AutoFill 注解标记时，
    // 都会触发这个切入点，从而可以在相应的通知中实现自动填充公共字段的逻辑
    @Pointcut("execution(* com.sky.mapper.*.*(..)) && @annotation(com.sky.annotation.AutoFill)")
    public void autoFillPointCut() {}

    /**
     * 前置通知，在切入点方法执行前，执行通知--进行公共字段自动填充逻辑 (反射 + AOP)
     * @param joinPoint 连接点信息
     */
    @Before("autoFillPointCut()")
    public void autoFill(JoinPoint joinPoint) {
        log.info("自动填充公共字段...");

        // 1.获取当前拦截方法的数据库操作类型（插入或更新）
        // 注意这里自动导包的话要导入 org.aspectj.lang.reflect.MethodSignature，
        // 不是 java.lang.reflect.MethodSignature
        // 否则调用不了getMethod()方法
        MethodSignature signature = (MethodSignature) joinPoint.getSignature();  // 获取方法签名
        AutoFill annotation = signature.getMethod().getAnnotation(AutoFill.class);// 获取方法上的注解
        OperationType operationType = annotation.value(); // 获取注解的值（操作类型）

        // 2.获取当前拦截方法的参数对象（实体类对象）
        Object[] args = joinPoint.getArgs(); // 获取方法参数
        if (args == null || args.length == 0) {
            return; // 如果没有参数，直接返回
        }
        Object entity = args[0]; // 项目约定第一个参数是实体类对象

        // 3.根据操作类型，准备需要填充的公共字段及其值（如创建时间、更新时间、创建人、更新人等）
        LocalDateTime now = LocalDateTime.now();
        Long currentId = BaseContext.getCurrentId();

        // 4.使用反射机制，给实体类对象的公共字段赋值（如创建时间、更新时间、创建人、更新人等）
        if(operationType == OperationType.INSERT) {
            // 插入操作，准备插入时需要填充的字段及其值 (四个字段)
            try {
                // 通过反射获取实体类的公共字段的set方法
                Method setCreateUser = entity.getClass().getDeclaredMethod(AutoFillConstant.SET_CREATE_USER, Long.class);
                Method setCreateTime = entity.getClass().getDeclaredMethod(AutoFillConstant.SET_CREATE_TIME, LocalDateTime.class);
                Method setUpdateUser = entity.getClass().getDeclaredMethod(AutoFillConstant.SET_UPDATE_USER, Long.class);
                Method setUpdateTime = entity.getClass().getDeclaredMethod(AutoFillConstant.SET_UPDATE_TIME, LocalDateTime.class);
                // 调用set方法，给实体类对象的公共字段赋值
                setCreateUser.invoke(entity, currentId);
                setCreateTime.invoke(entity, now);
                setUpdateUser.invoke(entity, currentId);
                setUpdateTime.invoke(entity, now);
            } catch (NoSuchMethodException | IllegalAccessException | InvocationTargetException e) {
                throw new RuntimeException(e);
            }
        } else if (operationType == OperationType.UPDATE) {
            // 更新操作，准备更新时需要填充的字段及其值 (两个字段)
            try {
                // 通过反射获取实体类的公共字段的set方法
                Method setUpdateUser = entity.getClass().getDeclaredMethod(AutoFillConstant.SET_UPDATE_USER, Long.class);
                Method setUpdateTime = entity.getClass().getDeclaredMethod(AutoFillConstant.SET_UPDATE_TIME, LocalDateTime.class);
                // 调用set方法，给实体类对象的公共字段赋值
                setUpdateUser.invoke(entity, currentId);
                setUpdateTime.invoke(entity, now);
            } catch (NoSuchMethodException | IllegalAccessException | InvocationTargetException e) {
                throw new RuntimeException(e);
            }
        }
    }
}
```

#### 3）在Mapper的编辑（插入、更新）相关方法加上注解image-20251012100810762

**同时**，将业务层为公共字段赋值的代码注释掉。

1). 将员工管理的新增和编辑方法中的公共字段赋值的代码注释。

2). 将菜品分类管理的新增和修改方法中的公共字段赋值的代码注释。

### 功能测试

* 初步测试，发现前置通知成功拦截方法

  ![image-20251012101400679](/images/posts/image-20251012101400679.png)
* 完善切面类中前置通知的公共字段自动填充逻辑后，进行调试，观察线程和变量捕获情况

  ![image-20251012121509064](/images/posts/image-20251012121509064.png)

## 2.新增菜品

### 需求分析与接口设计

新增菜品的**产品原型**：  
![image-20251012122838118](/images/posts/image-20251012122838118.png)

**业务规则：**

* 菜品名称必须是唯一的
* 菜品必须属于某个分类下，不能单独存在
* 新增菜品时可以根据情况选择菜品的口味
* 每个菜品必须对应一张图片

**接口设计**：明确每个接口的请求方式、请求路径、传入参数和返回值。

* 根据类型查询分类（已完成）
* 文件上传
* 新增菜品

**1. 根据类型查询分类**

![image-20221121165033612](/images/posts/image-20221121165033612-1760243432816-9.png) ![image-20221121165043619](/images/posts/image-20221121165043619.png)

**2. 文件上传**

![image-20221121165201319](/images/posts/image-20221121165201319-1760243432816-11.png)![image-20221121165215634](/images/posts/image-20221121165215634.png)

**3. 新增菜品**

![image-20221121165254961](/images/posts/image-20221121165254961.png)![image-20221121165308394](/images/posts/image-20221121165308394.png)![image-20221121165322687](/images/posts/image-20221121165322687-1760243432807-7.png)

**数据库设计**：涉及两张表——dish和dish\_flavor，通过逻辑外键建立联系

**1). 菜品表:dish**

| **字段名** | **数据类型** | **说明** | **备注** |
| --- | --- | --- | --- |
| id | bigint | 主键 | 自增 |
| name | varchar(32) | 菜品名称 | 唯一 |
| category\_id | bigint | 分类id | 逻辑外键 |
| price | decimal(10,2) | 菜品价格 |  |
| image | varchar(255) | 图片路径 |  |
| description | varchar(255) | 菜品描述 |  |
| status | int | 售卖状态 | 1起售 0停售 |
| create\_time | datetime | 创建时间 |  |
| update\_time | datetime | 最后修改时间 |  |
| create\_user | bigint | 创建人id |  |
| update\_user | bigint | 最后修改人id |  |

**2). 菜品口味表:dish\_flavor**

| **字段名** | **数据类型** | **说明** | **备注** |
| --- | --- | --- | --- |
| id | bigint | 主键 | 自增 |
| dish\_id | bigint | 菜品id | 逻辑外键 |
| name | varchar(32) | 口味名称 |  |
| value | varchar(255) | 口味值 |  |

### 代码编写

#### 1. 文件上传

在项目初始代码已有一部分阿里OSS配置文件  
**AliOssProperties.java** （阿里云OSS属性配置JavaBean类）

![image-20251012142649962](/images/posts/image-20251012142649962.png)

**application.yml** （这里读取了配置属性JavaBean类的字段值）

![image-20251012142702849](/images/posts/image-20251012142702849.png)

**AliOssUtil.java** （这里是文件上传的具体实现）

![image-20251012142710484](/images/posts/image-20251012142710484.png)

**OssConfiguration.java**

```java
package com.sky.config;

import com.sky.properties.AliOssProperties;
import com.sky.utils.AliOssUtil;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * OSS配置类, 用于创建AliOssUtil对象, 读取配置文件中的OSS相关配置, 并提供给AliOssUtil使用
 */
@Configuration // 表示该类是一个配置类, 可以包含Bean定义
@Slf4j
public class OssConfiguration {

    @Bean // 将方法的返回值作为Bean对象注册到Spring容器中
    @ConditionalOnMissingBean // 当容器中没有指定类型的Bean时, 才会创建该Bean
    public AliOssUtil aliOssUtil(AliOssProperties aliOssProperties) {
        log.info("开始创建阿里云文件上传工具类对象AliOssUtil, {}", aliOssProperties);
        return new AliOssUtil(
                aliOssProperties.getEndpoint(),
                aliOssProperties.getAccessKeyId(),
                aliOssProperties.getAccessKeySecret(),
                aliOssProperties.getBucketName()
        );
    }
}
```

**CommonController.java**

```java
package com.sky.controller.admin;

import com.sky.constant.MessageConstant;
import com.sky.result.Result;
import com.sky.utils.AliOssUtil;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.UUID;

@RestController
@Slf4j
@RequestMapping("/admin/common")
@Api(tags = "通用接口")
public class CommonController {

    @Autowired
    private AliOssUtil aliOssUtil;

    /**
     * 文件上传
     *
     * @param file 文件
     * @return 文件访问路径
     */
    @RequestMapping("/upload")
    @ApiOperation("文件上传")
    public Result<String> upload(MultipartFile file) {
        log.info("文件上传: {}", file);
        // 获取原始文件名
        String originalFilename = file.getOriginalFilename();
        // 获取文件后缀名
        String extension = originalFilename.substring(originalFilename.lastIndexOf("."));
        // 构造新文件名(防止文件名重复)
        String objectName = UUID.randomUUID().toString() + extension;
        // 上传文件到OSS, 并接收返回的文件访问路径
        try {
            String fileUrl = aliOssUtil.upload(file.getBytes(), objectName);
            // 返回文件访问路径
            return Result.success(fileUrl);
        } catch (IOException e) {
            log.error("文件上传失败: {}", e.getMessage());

        }
        return Result.error(MessageConstant.UPLOAD_FAILED); // 上传失败
    }
}
```

#### 2. 新增菜品

**DishController.java**

```java
package com.sky.controller.admin;

import com.sky.dto.DishDTO;
import com.sky.result.Result;
import com.sky.service.DishService;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/admin/dish")
@Slf4j
@Api(tags = "菜品管理")
public class DishController {

    @Autowired
    private DishService dishService;

    /**
     * 新增菜品
     * @param dishDTO 菜品信息
     * @return 操作结果
     */
    @PostMapping
    @ApiOperation("新增菜品")
    public Result<Void> save(@RequestBody DishDTO dishDTO) {  // 这里DTO信息记得要加RequestBody，否则接受不到数据 @RequestBody 将请求体中的json数据转换为对应的Java对象
        log.info("新增菜品: {}", dishDTO);
        dishService.saveWithFlavor(dishDTO);
        return Result.success();
    }
}
```

**DishServiceImpl.java**

这里注意涉及多表要**开启事务**

```java
package com.sky.service.impl;

import com.sky.dto.DishDTO;
import com.sky.entity.Dish;
import com.sky.entity.DishFlavor;
import com.sky.mapper.DishFlavorMapper;
import com.sky.mapper.DishMapper;
import com.sky.service.DishService;
import org.springframework.beans.BeanUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class DishServiceImpl implements DishService {

    @Autowired
    private DishMapper dishMapper;
    @Autowired
    private DishFlavorMapper dishFlavorMapper;

    /**
     * 新增菜品，同时保存对应的口味数据, 所以方法名字WithFlavor体现出来, 需要操作两张表：dish、dish_flavor, 需要开启事务, 保证数据一致性
     * @param dishDTO 菜品信息
     */
    @Override
    @Transactional  // 涉及多表操作，开启事务
    public void saveWithFlavor(DishDTO dishDTO) {
        Dish dish = new Dish();
        BeanUtils.copyProperties(dishDTO, dish);

        // 1. 向菜品表中插入 1 条数据，保存菜品的基本信息到菜品表dish
        dishMapper.insert(dish);

        // 2. 向菜品口味表中插入 n 条数据（一个菜品可能有0 或多个以上口味），保存菜品的口味数据到菜品口味表dish_flavor
        Long dishId = dish.getId(); // 获取菜品id
        List<DishFlavor> flavors = dishDTO.getFlavors(); // 获取口味数据
        // 需要判断flavors是否为空，不为空才进行插入
        if (flavors != null && !flavors.isEmpty()) {
            // 遍历口味数据，逐个设置口味对应的菜品id
            flavors.forEach(flavor -> flavor.setDishId(dishId));
            // 批量插入口味数据
            dishFlavorMapper.insertBatch(flavors);
        }
    }
}
```

**DishMapper.java**

```java
package com.sky.mapper;

import com.sky.annotation.AutoFill;
import com.sky.entity.Dish;
import com.sky.enumeration.OperationType;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;

@Mapper
public interface DishMapper {

    /**
     * 根据分类id查询菜品数量
     * @param categoryId 分类Id
     * @return 数量
     */
    @Select("select count(id) from dish where category_id = #{categoryId}")
    Integer countByCategoryId(Long categoryId);

    /**
     * 插入菜品, 这里记得需要在xml设置属性：useKeyProperty：主键自增, keyProperty：插入后会将生成的主键回填到实体类对象中的id属性
     * @param dish 菜品
     */
    @AutoFill(OperationType.INSERT)
    void insert(Dish dish);
}
```

**DishFlavorMapper.java**

```java
package com.sky.mapper;

import com.sky.entity.DishFlavor;
import org.apache.ibatis.annotations.Mapper;

import java.util.List;

@Mapper
public interface DishFlavorMapper {

    /**
     * 批量插入口味数据
     * @param flavors 口味数据
     */
    void insertBatch(List<DishFlavor> flavors);
}
```

**DishMapper.xml**

```xml
<?xml version="1.0" encoding="UTF-8" ?>
<!DOCTYPE mapper PUBLIC "-//mybatis.org//DTD Mapper 3.0//EN"
        "http://mybatis.org/dtd/mybatis-3-mapper.dtd" >
<mapper namespace="com.sky.mapper.DishMapper">

    <insert id="insert" useGeneratedKeys="true" keyProperty="id">
        insert into dish
        (name, category_id, price, image, description, status, create_time, update_time, create_user, update_user)
        values
        (#{name}, #{categoryId}, #{price}, #{image}, #{description}, #{status}, #{createTime}, #{updateTime}, #{createUser}, #{updateUser})
    </insert>
</mapper>
```

**DishFlavorMapper.xml**

```xml
<?xml version="1.0" encoding="UTF-8" ?>
<!DOCTYPE mapper PUBLIC "-//mybatis.org//DTD Mapper 3.0//EN"
        "http://mybatis.org/dtd/mybatis-3-mapper.dtd" >
<mapper namespace="com.sky.mapper.DishFlavorMapper">

    <insert id="insertBatch">
        insert into dish_flavor (dish_id, name, value) values
        <foreach collection="flavors" item="df" separator=",">
            (#{df.dishId}, #{df.name}, #{df.value})
        </foreach>
    </insert>
</mapper>
```

### Debug问题发现记录

#### 1）在Controller那里，DTO是json传来的，需要加RequestBody注解，否则会导致接收不到数据，全为null

#### 2）在dishMapper.xml那里不要忘记加两个属性值配置：useGeneratedKeys = true 和 keyProperty = ”id”

#### 3）dish\_flavor表没有公共字段需要填充，不用加AutoFill注解

#### 4）还有一个Bug是因为dishFlavor中insert into的字段顺序和foreach里面的顺序没对应上，导致insertBatch操作一直有问题但是没报错，因为一开始那里是用代码补全来写的，后面仔细看才发现顺序没对上😭

#### 5）写分页查询发现遗漏了一点，这里做个补充，涉及多表要**开启事务**@Transactional注解保证原子性（在Service那里）

### 功能测试

#### 文件上传测试

在文件上传时，若文件成功上传到阿里云，但是前端没有回显，需要在阿里云做如下配置 ：  
设置文件管理的 “阻止公共访问” 和 ”读写权限”

1）关闭阻止公共访问  
![image-20251012141856723](/images/posts/image-20251012141856723.png)

2）读写权限设为公共读  
![image-20251012141904531](/images/posts/image-20251012141904531.png)

设置好后发现图片显示就没问题了

前端图片显示正常  
![image-20251012142202054](/images/posts/image-20251012142202054.png)

成功上传到阿里云OSS  
![image-20251012142212893](/images/posts/image-20251012142212893.png)

#### 新增菜品测试

注意：在测试新增菜品时，名字不要设置成在表中已有的，我一开始拿“北冰洋”来测试发现一直失败，后面才发现是名字要唯一，表中初始自带了北冰洋所以测试不了

测试成功图，因为还没做分页查询，所以直接查看数据库是否添加成功新数据

菜品添加成功  
![image-20251012153940610](/images/posts/image-20251012153940610.png)

口味添加成功  
![image-20251012155802631](/images/posts/image-20251012155802631.png)

## 3.菜品分页查询

### 需求分析与接口设计

**业务规则：**

* 根据页码展示菜品信息
* 每页展示10条数据
* 分页查询时可以根据需要输入菜品名称、菜品分类、菜品状态进行查询

**接口设计：**  
![image-20221121202019258](/images/posts/image-20221121202019258.png) ![image-20221121202033284](/images/posts/image-20221121202033284.png)

* 这里大体上步骤跟前面员工分页查询一致，但是需要注意的是由于前端展示Dish时还需要分类名称，所以多封装了一个 **DishVO** （除了多分类名称，还有口味数组）实体类作为分页结果**Page的泛型**。

  ![image-20251012165640112](/images/posts/image-20251012165640112.png)
* 此外就是这个分页查询会涉及到**dish和category两张表**的，用了一个**左外连接**来查询二表信息。

### 代码编写

**DishController.java**

```java
/**
 * 分页查询菜品
 * @param dishPageQueryDTO 分页查询参数
 * @return 分页查询结果
 */
@GetMapping("/page")
@ApiOperation("分页查询菜品")
public Result<PageResult> page(DishPageQueryDTO dishPageQueryDTO) {
    log.info("分页查询菜品: {}", dishPageQueryDTO);
    PageResult pageResult = dishService.pageQuery(dishPageQueryDTO);
    return Result.success(pageResult);
}
```

**DishServiceImpl.java**

```java
/**
 * 分页查询菜品
 * @param dishPageQueryDTO 分页查询参数
 * @return 分页查询结果
 */
@Override
public PageResult pageQuery(DishPageQueryDTO dishPageQueryDTO) {
    PageHelper.startPage(dishPageQueryDTO.getPage(), dishPageQueryDTO.getPageSize());
    // 需要注意的是这里 Page 的泛型是 DishVO， 因为返回给前端的视图，除了要有菜品信息Dish，还要有分类名称categoryName，而项目中的 DishVO 中已经做好了分类名称的封装
    // 具体分类名称的封装是在 mapper.xml 中通过 left join 关联查询的 (c.name as categoryName), 见 dishMapper.xml
    Page<DishVO> page = dishMapper.pageQuery(dishPageQueryDTO);
    return new PageResult(page.getTotal(), page.getResult());
}
```

**DishMapper.xml**

```xml
<select id="pageQuery" resultType="com.sky.vo.DishVO">
        select d.*, c.name ascategoryName
        from dish d left outer join category c
        on d.category_id = c.id
        <where>
            <if test="name != null and name != ''">
                and d.name like concat('%', #{name}, '%')
            </if>
            <if test="categoryId != null">>
                and d.category_id = #{categoryId}
            </if>
            <if test="status != null">
                and d.status = #{status}
            </if>
        </where>
        order by d.update_time desc
    </select>
```

### 功能测试

接口文档测试

![image-20251012170915227](/images/posts/image-20251012170915227.png)

前后端联调测试（图片不在我的阿里云所以显示不了，这是正常的）

![image-20251012170933704](/images/posts/image-20251012170933704.png)

## 4.删除菜品

### 需求分析与接口设计

**业务规则：**

* 可以一次删除一个菜品，也可以批量删除菜品
* 起售中的菜品不能删除
* 被套餐关联的菜品不能删除
* 删除菜品后，关联的口味数据也需要删除掉

**接口设计:**  
![image-20251012171359093](/images/posts/image-20251012171359093.png)

**注意**：删除一个菜品和批量删除菜品共用一个接口，故ids可包含多个菜品id,之间用逗号分隔。

**表设计：**

菜品删除会涉及三张表  
![image-20251012171525991](/images/posts/image-20251012171525991.png)

**注意事项：**

* 在dish表中删除菜品基本数据时，同时，也要把关联在dish\_flavor表中的数据一块删除。
* setmeal\_dish表为菜品和套餐关联的中间表。
* 若删除的菜品数据关联着某个套餐，此时，删除失败。
* 若要删除套餐关联的菜品数据，先解除两者关联，再对菜品进行删除。

### 代码编写

**DishController.java**

```java
/**
 * (批量)删除菜品
 * @param ids 菜品id，多个id用逗号分隔
 * @return 操作结果
 */
@DeleteMapping
@ApiOperation("删除菜品")
public Result<Void> delete(@RequestParam("ids") List<Long> ids) { // 这里用@RequestParam注解接收ids参数
    log.info("(批量)删除菜品: {}", ids);
    dishService.deleteBatch(ids);
    return Result.success();
}
```

**DishServiceImpl.java**

```java
/**
 * (批量)删除菜品
 * @param ids 菜品id，多个id用逗号分隔
 */
@Override
@Transactional  // 涉及多表操作，开启事务
public void deleteBatch(List<Long> ids) {
    // 菜品处于起售状态，不能删除
    for(Long id : ids) {
        Dish dish = dishMapper.getById(id);
        if (Objects.equals(dish.getStatus(), StatusConstant.ENABLE)) {
            throw new DeletionNotAllowedException(MessageConstant.DISH_ON_SALE);
        }
    }
    // 菜品被套餐关联，不能删除
    List<Long> setmealIds = setmealDishMapper.getSetmealIdsByDishIds(ids);
    if(setmealIds != null && !setmealIds.isEmpty()) {
        throw new DeletionNotAllowedException(MessageConstant.DISH_BE_RELATED_BY_SETMEAL);
    }

    // 这里有个优化，为了避免循环删除多次sql操作，可以直接批量删除，用in语句 (多次SQL语句执行效率低)

    // 删除菜品数据
    // SQL: delete from dish where id in (1, 2, 3);
    dishMapper.deleteBatchByIds(ids);
    // 删除菜品关联的口味数据
    // SQL: delete from dish_flavor where dish_id in (1, 2, 3);
    dishFlavorMapper.deleteBatchByDishIds(ids);
}
```

**DishMapper.java**

```java
/**
 * 根据id查询菜品
 * @param id 菜品id
 * @return 菜品
 */
@Select("select * from dish where id = #{id}")
Dish getById(Long id);

/**
 * 批量删除菜品
 * @param ids 菜品id，多个id用逗号分隔
 */
void deleteBatchByIds(List<Long> ids);
```

**DishMapper.xml**

```xml
<delete id="deleteBatchByIds">
    delete from dish
    where id in
    <foreach collection="ids" item="id" open="(" separator="," close=")">
        #{id}
    </foreach>
</delete>
```

**SetmealDishMapper.java**

```java
package com.sky.mapper;

import org.apache.ibatis.annotations.Mapper;

import java.util.List;

@Mapper
public interface SetmealDishMapper {

    /**
     * 根据菜品id查询对应的套餐id
     * @param dishIds 菜品id
     * @return 套餐id
     */
    List<Long> getSetmealIdsByDishIds(List<Long> dishIds);
}
```

**SetmealDishMapper.xml**

```xml
<?xml version="1.0" encoding="UTF-8" ?>
<!DOCTYPE mapper PUBLIC "-//mybatis.org//DTD Mapper 3.0//EN"
        "http://mybatis.org/dtd/mybatis-3-mapper.dtd" >
<mapper namespace="com.sky.mapper.SetmealDishMapper">
    <select id="getSetmealIdsByDishIds" resultType="java.lang.Long">
        select setmeal_id from setmeal_dish
        where dish_id in
        <foreach collection="dishIds" item="dishId" open="(" separator="," close=")">
            #{dishId}
        </foreach>
    </select>
</mapper>
```

**DishFlavorMapper.java**

```java
/**
 * 根据菜品集合ids批量删除对应的口味数据
 * @param dishIds 菜品id，多个id用逗号分隔
 */
void deleteBatchByDishIds(List<Long> dishIds);
```

**DishFlavorMapper.xml**

```xml
<delete id="deleteBatchByDishIds">
    delete from dish_flavor
    where dish_id in
    <foreach collection="dishIds" item="dishId" open="(" separator="," close=")">
        #{dishId}
    </foreach>
</delete>
```

### 功能测试

略

## 5. 修改菜品

### 需求分析与接口设计

**修改菜品原型**  
![image-20251012183851728](/images/posts/image-20251012183851728.png)

**接口设计：**

* 根据id查询菜品
* 根据类型查询分类(已实现)
* 文件上传(已实现)
* 修改菜品

![image-20251012184023473](/images/posts/image-20251012184023473.png)

这里要注意修改菜品 ，**id字段是必须的**  
![image-20251012184045407](/images/posts/image-20251012184045407.png)

### 代码编写

**DishController.java**

```java
/**
 * 修改菜品, 同时更新对应的口味数据
 * @param dishDTO 菜品信息
 * @return 操作结果
 */
@PutMapping
@ApiOperation("修改菜品")
public Result<Void> update(@RequestBody DishDTO dishDTO) {
    log.info("修改菜品: {}", dishDTO);
    dishService.updateWithFlavor(dishDTO);
    return Result.success();
}
```

**DishServiceImpl.java**

```java
/**
 * 修改菜品，同时更新对应的口味数据
 * @param dishDTO 菜品信息
 */
@Override
@Transactional  // 涉及多表操作，开启事务
public void updateWithFlavor(DishDTO dishDTO) {
    // 1. 更新菜品基本信息到菜品表dish
    Dish dish = new Dish();
    BeanUtils.copyProperties(dishDTO, dish);
    dishMapper.update(dish);

    List<Long> ids = List.of(dishDTO.getId());
    // 删除原有口味数据
    dishFlavorMapper.deleteBatchByDishIds(ids);

    // 重新插入口味数据
    List<DishFlavor> flavors = dishDTO.getFlavors(); // 获取口味数据
    // 需要判断flavors是否为空，不为空才进行插入
    if (flavors != null && !flavors.isEmpty()) {
        // 遍历口味数据，逐个设置口味对应的菜品id
        flavors.forEach(flavor -> flavor.setDishId(dishDTO.getId()));
        // 批量插入口味数据
        dishFlavorMapper.insertBatch(flavors);
    }
}
```

**DishMapper.java**

```java
/**
 * 修改菜品
 * @param dish 菜品
 */
@AutoFill(OperationType.UPDATE) // 修改操作，自动填充
void update(Dish dish);
```

**DishMapper.xml**

```xml
<update id="update">
    update dish
    <set>
        <if test="name != null">name = #{name},</if>
        <if test="categoryId != null">category_id = #{categoryId},</if>
        <if test="price != null">price = #{price},</if>
        <if test="image != null">image = #{image},</if>
        <if test="description != null">description = #{description},</if>
        <if test="status != null">status = #{status},</if>
        <if test="updateTime != null">update_time = #{updateTime},</if>
        <if test="updateUser != null">update_user = #{updateUser}</if>
    </set>
    where id = #{id}
</update>
```

**DishFlavorMapper.java**

```java
/**
 * 根据菜品id查询对应的口味数据
 * @param dishId 菜品id
 * @return 口味数据
 */
@Select("select * from dish_flavor where dish_id = #{dishId}")
List<DishFlavor> getByDishId(Long dishId);
```

### 功能测试

根据id查询菜品功能测试：

菜品信息及口味信息正常回显  
![image-20251012185442072](/images/posts/image-20251012185442072.png)

修改菜品信息功能测试：  
![image-20251012195244620](/images/posts/image-20251012195244620.png)

![image-20251012195254125](/images/posts/image-20251012195254125.png)

## 附：其他盲区知识补充

### 在阿里云OSS实现文件上传时——关于属性类、工具类、配置类的疑问

在苍穹外卖项目中，“工具类属性为空，需通过`config`包下的配置类注入” 的设计既体现了**软件设计的核心思路**，也是 Spring Boot 开发的**固定套路**。以下从 “设计本质”“核心思路”“实际好处” 三个维度详细解释：

#### 一、本质：解决「配置硬编码」与「环境隔离」的问题

阿里云 OSS 的配置（`endpoint`、`accessKeyId`、`accessKeySecret`、`bucketName`）属于**环境敏感信息**（开发 / 测试 / 生产环境的配置不同），如果直接写死在`AliOssUtil`工具类中，会导致以下问题：

1. **硬编码风险**：配置修改需重新编译代码、打包部署，运维成本高；
2. **安全隐患**：密钥信息暴露在代码中，易被泄露；
3. **环境混乱**：不同环境的配置混在代码里，易引发线上事故。

#### 二、核心设计思路：「配置外置化 + 依赖注入 + 解耦」

通过`config`包下的配置类管理 OSS 属性，本质是**将 “配置逻辑” 与 “业务逻辑” 分离**，遵循以下设计原则：

##### 1. 配置外置化（把配置从代码中抽离）

* 步骤

  ：将 OSS 配置写入application.yml （或 application-dev.yml / application-prod.yml）：

  ```yaml
  aliyun:
    oss:
      endpoint: oss-cn-hangzhou.aliyuncs.com
      access-key-id: LTAI5t9xxxxxxxxx
      access-key-secret: 3dxxxxxxxxx
      bucket-name: sky-take-out
  ```
* **目的**：配置与代码解耦，修改配置无需动代码，重启服务即可生效。

##### 2. 依赖注入（让 Spring 管理工具类的属性）

`AliOssUtil`工具类本身是 “业务逻辑类”（负责文件上传），不应关心 “配置从哪来”。通过**配置类 + `@ConfigurationProperties`** 实现 “配置注入”：

###### （1）创建配置类（如`OssConfiguration`）

```java
@Configuration // 标记为Spring配置类
@ConfigurationProperties(prefix = "aliyun.oss") // 绑定application.yml中以aliyun.oss开头的配置
@Data // 自动生成getter/setter
public class OssProperties {
    private String endpoint;
    private String accessKeyId;
    private String accessKeySecret;
    private String bucketName;
}
```

###### （2）将工具类注册为 Spring Bean 并注入配置

```java
@Configuration // 配置类
public class OssConfiguration {

    @Autowired
    private OssProperties ossProperties; // 注入配置属性

    @Bean // 将AliOssUtil注册为Spring Bean
    public AliOssUtil aliOssUtil() {
        AliOssUtil util = new AliOssUtil();
        // 给工具类的属性赋值
        util.setEndpoint(ossProperties.getEndpoint());
        util.setAccessKeyId(ossProperties.getAccessKeyId());
        util.setAccessKeySecret(ossProperties.getAccessKeySecret());
        util.setBucketName(ossProperties.getBucketName());
        return util;
    }
}
```

###### （3）工具类定义（简洁化，只关注业务）

```java
@Component // 让Spring管理
public class AliOssUtil {
    private String endpoint;
    private String accessKeyId;
    private String accessKeySecret;
    private String bucketName;

    // setter方法（供配置类注入）
    public void setEndpoint(String endpoint) { this.endpoint = endpoint; }
    // 其他setter...

    // 业务方法：文件上传
    public String upload(byte[] bytes, String objectName) {
        // 使用endpoint、accessKeyId等属性完成OSS上传
        OSS ossClient = new OSSClientBuilder().build(endpoint, accessKeyId, accessKeySecret);
        // ... 上传逻辑 ...
    }
}
```

##### 3. 解耦（业务逻辑与配置逻辑分离）

* **业务逻辑（`AliOssUtil`）**：只负责 “文件上传”，不关心配置从哪来；
* **配置逻辑（`OssConfiguration` + `OssProperties`）**：只负责 “读取配置、注入属性”，不关心业务怎么用。

#### 三、这是 Spring Boot 的「固定套路」

在 Spring Boot 开发中，对接 **第三方服务（如 OSS、Redis、数据库、消息队列）** 时，几乎都遵循 “配置类 + 工具类 / 服务类” 的套路：

1. **配置外置**：把第三方服务的参数（如密钥、地址）写在`application.yml`；
2. **配置类封装**：用`@ConfigurationProperties`将配置绑定到 Java 类（如`OssProperties`）；
3. **Bean 注册 + 注入**：在配置类中创建第三方服务的工具类 Bean（如`AliOssUtil`），并注入配置属性；
4. **业务层调用**：其他组件通过`@Autowired`注入工具类，直接使用。

#### 四、实际好处（为什么必须这么做？）

1. **环境隔离**：开发环境用测试 OSS 桶，生产环境用正式桶，只需改配置文件；
2. **安全合规**：密钥等敏感信息不进代码库，符合企业级安全规范；
3. **可维护性**：配置集中管理，新人接手时只需看`application.yml`就知道系统依赖了哪些第三方服务；
4. **扩展性**：若需切换 OSS 服务商（如从阿里云换成腾讯云），只需修改配置类和工具类，业务层无感知。

总结：这种设计既是 **“配置外置化 + 依赖注入” 的软件设计思路 **（解耦、可维护），也是 Spring Boot 开发第三方服务的**固定套路**（约定优于配置）。通过 “配置类 + 工具类” 的分工，让代码更优雅、更易维护。

---

> ***以下是项目中的代码的解释***

结合你提供的代码和之前的设计思路，这两个类（`AliOssProperties` 和 `AliOssUtil`）的分工与配合体现了 **“配置与业务分离”** 的核心思想，我们一步步拆解：

### 一、`AliOssProperties`：配置属性的 “容器”

这个类的核心作用是 **“把配置文件中的 OSS 参数映射到 Java 对象”**，相当于一个 “配置容器”。

#### 关键注解解析

1. **`@Component`**：将该类标记为 Spring 的组件，让 Spring 容器管理它（自动创建实例）。
2. `@ConfigurationProperties(prefix = "sky.alioss")`

   * 告诉 Spring：“去配置文件（如`application.yml`）中找所有以`sky.alioss`为前缀的配置项，把它们的值赋给当前类的同名字段”。
   * 例如，配置文件中若有：

     ```yaml
     sky:
       alioss:
         endpoint: oss-cn-beijing.aliyuncs.com
         access-key-id: ABC123
         access-key-secret: XYZ456
         bucket-name: my-takeout
     ```

     Spring 会自动将这些值分别赋给AliOssProperties的endpoint、accessKeyId等字段。
3. **`@Data`**：Lombok 注解，自动生成`getter`、`setter`方法（Spring 注入配置时需要这些方法）。

#### 为什么需要这个类？

如果没有`AliOssProperties`，要获取配置就得手动写代码读取`application.yml`（比如用`@Value`注解逐个注入），但当配置项较多时（如这里的 4 个参数），代码会很繁琐：

```java
// 不推荐：用@Value逐个注入，配置项多了会很冗余
@Component
public class AliOssUtil {
    @Value("${sky.alioss.endpoint}")
    private String endpoint;
    @Value("${sky.alioss.access-key-id}")
    private String accessKeyId;
    // ... 其他参数
}
```

而`AliOssProperties`通过`@ConfigurationProperties`一次性绑定所有配置，更简洁、更易维护。

### 二、`AliOssUtil`：OSS 操作的 “业务工具”

这个类是 **“实际干活的工具”**，负责调用阿里云 OSS 的 SDK 完成文件上传，它的核心是`upload`方法。

#### 关键设计解析

1. `@AllArgsConstructor`：Lombok 注解，自动生成一个包含所有字段（endpoint、accessKeyId等）的构造函数。
   * 作用：方便通过 “构造函数注入” 的方式，将`AliOssProperties`中的配置参数传递给`AliOssUtil`（后面会讲如何配合）。
2. **字段设计**：`endpoint`、`accessKeyId`等字段与`AliOssProperties`完全对应，因为这些是 OSS 上传必须的参数。
3. **`upload`方法**：使用注入的参数创建 OSS 客户端（`OSS ossClient`），执行上传逻辑，最终返回文件的访问 URL。

#### 为什么工具类不自己读取配置？

如果`AliOssUtil`自己读取配置（比如硬编码或手动解析配置文件），会导致：

* 工具类与配置强耦合：换环境（如开发→生产）时，需要修改工具类代码；
* 复用性差：如果另一个模块也需要 OSS 上传，得重复写读取配置的逻辑；
* 测试困难：单元测试时无法方便地替换为测试环境的配置。

### 三、两个类如何 “配合工作”？

目前你的代码中还缺少一个 **“配置类”**（如`OssConfig`），它是连接`AliOssProperties`和`AliOssUtil`的 “桥梁”。完整流程如下：

#### 步骤 1：配置类创建`AliOssUtil`实例并注入配置

```java
@Configuration // 标记为Spring配置类
public class OssConfig {

    @Autowired
    private AliOssProperties aliOssProperties; // 注入配置容器

    @Bean // 将AliOssUtil注册为Spring Bean，供其他组件使用
    public AliOssUtil aliOssUtil() {
        // 调用AliOssUtil的全参构造函数，传入配置参数
        return new AliOssUtil(
            aliOssProperties.getEndpoint(),
            aliOssProperties.getAccessKeyId(),
            aliOssProperties.getAccessKeySecret(),
            aliOssProperties.getBucketName()
        );
    }
}
```

#### 步骤 2：业务代码中直接使用`AliOssUtil`

当需要上传文件时，直接注入`AliOssUtil`即可，无需关心配置细节：

```java
@Service
public class FileUploadService {

    @Autowired
    private AliOssUtil aliOssUtil; // 注入工具类

    public String uploadFile(MultipartFile file) throws IOException {
        byte[] bytes = file.getBytes();
        String fileName = UUID.randomUUID().toString() + file.getOriginalFilename();
        return aliOssUtil.upload(bytes, fileName); // 直接调用上传方法
    }
}
```

### 四、这种设计的核心优势

1. **配置集中管理**：所有 OSS 参数都在`application.yml`中，改配置无需动代码。
2. **业务与配置解耦**：`AliOssUtil`只负责上传，不关心配置从哪来；`AliOssProperties`只负责存配置，不关心怎么用。
3. **环境隔离**：开发 / 测试 / 生产环境的配置可以写在不同的配置文件（如`application-dev.yml`、`application-prod.yml`），通过`spring.profiles.active`切换。
4. **可测试性**：单元测试时，可以手动创建`AliOssUtil`实例，传入测试用的 OSS 配置（如本地 MinIO 服务），无需依赖真实阿里云环境。

### 总结

* `AliOssProperties`：相当于 “配置的搬运工”，把`application.yml`中的 OSS 参数搬到 Java 对象里，方便 Spring 管理。
* `AliOssUtil`：相当于 “实际干活的工人”，拿着`AliOssProperties`提供的 “工具（配置）” 完成文件上传。
* 中间通过配置类（`OssConfig`）连接，形成 “配置→容器→工具→业务” 的完整链路，这是 Spring Boot 处理第三方服务（如 OSS、Redis、数据库）的标准套路，既规范又灵活。

---

### dishFlavor 的dishId 循环赋值的理解

这段代码中循环给每个`dishFlavor`设置`dishId`，核心原因是**建立菜品与口味之间的关联关系**，具体可以从这几个角度理解：

#### 1. 业务逻辑：一个菜品对应多个口味

一道菜（`Dish`）可能有多个口味（比如 “麻辣烫” 可能有 “微辣”、”中辣”、”特辣” 等口味）。这些口味需要明确 “属于哪道菜”，否则数据库中就无法区分某个口味是哪个菜品的。

#### 2. 数据库设计：通过外键关联

在数据库中，`dish`表（菜品表）和`dish_flavor`表（口味表）是**一对多**的关系：

* `dish`表的主键是`dish_id`（即代码中的`dishId`）
* `dish_flavor`表需要一个`dish_id`字段作为**外键**，关联到`dish`表的主键

这样设计的目的是：通过`dish_id`可以查询到某道菜的所有口味（比如 “查询麻辣烫的所有口味”）。

#### 3. 代码逻辑：批量设置外键

代码中：

* 先插入菜品信息到`dish`表，获取数据库生成的主键`dishId`（这是当前菜品的唯一标识）
* `dishDTO.getFlavors()`获取的是当前菜品的所有口味列表（多个`DishFlavor`对象）
* 循环给每个`DishFlavor`设置`dishId`，就是给每个口味 “打上所属菜品的标签”
* 最后批量插入到`dish_flavor`表时，所有口味就能通过`dishId`正确关联到对应的菜品

举个例子：如果新增一道 “宫保鸡丁”（`dishId=100`），它有 “微辣” 和 “不辣” 两个口味。循环设置后，两个口味的`dishId`都会被设为 100，插入到数据库后，就能明确这两个口味都属于 “宫保鸡丁” 这道菜了。
